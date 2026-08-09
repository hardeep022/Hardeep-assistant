import { app, BrowserWindow, ipcMain, safeStorage, shell, globalShortcut, Tray, Menu, nativeImage, session, desktopCapturer } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import { spawn, exec, type ChildProcessWithoutNullStreams } from "node:child_process";
import { selectWorkspaceDirectory, buildWorkspaceTree, computeFileDiff } from "./workspaceService.js";
import { searchCodebase } from "./codeSearchService.js";
import { performWebSearch } from "./webSearchService.js";
import { parseDocumentFile } from "./documentService.js";
import { benchmarkModel } from "./benchmarkService.js";
import { parseAudioFile } from "./audioAnalysisService.js";




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Isolate dev userData path by PID to permanently eliminate Chromium SingletonLock Error 32
if (!app.isPackaged) {
  const devDir = path.join(os.tmpdir(), `nova-dev-session-${process.pid}`);
  try {
    fs.mkdirSync(devDir, { recursive: true });
    app.setPath("userData", devDir);
  } catch {}
}

app.commandLine.appendSwitch("enable-features", "AudioServiceOutOfProcess");

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isAppQuitting = false;
let voiceProcess: ChildProcessWithoutNullStreams | null = null;
let voiceReady = false;
let voiceOutputBuffer = "";
const queuedVoiceCommands: string[] = [];

type Provider = "openai" | "gemini" | "anthropic" | "ollama";
type ChatMessage = { role: "user" | "assistant"; content: string };
type Settings = {
  openaiKey: string;
  geminiKey: string;
  anthropicKey: string;
  ollamaUrl: string;
  defaultModel: string;
};

const PROVIDERS = new Set<Provider>(["openai", "gemini", "anthropic", "ollama"]);
const SECRET_SETTING_KEYS = ["openaiKey", "geminiKey", "anthropicKey"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && PROVIDERS.has(value as Provider);
}

function isLoopbackUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 512) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isChatMessages(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length <= 100 && value.every(message =>
    isRecord(message) &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" && message.content.length <= 100_000
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function sendVoiceEvent(event: Record<string, unknown>) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("voice:event", event);
}

function getVoiceServicePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "voice", "voice_service.py")
    : path.join(__dirname, "../voice/voice_service.py");
}

function writeVoiceCommand(command: Record<string, unknown>) {
  const encoded = `${JSON.stringify(command)}\n`;
  if (!voiceReady || !voiceProcess?.stdin.writable) {
    queuedVoiceCommands.push(encoded);
    return;
  }
  voiceProcess.stdin.write(encoded);
}

function startVoiceService() {
  if (voiceProcess) return;
  const servicePath = getVoiceServicePath();
  if (!fs.existsSync(servicePath)) {
    sendVoiceEvent({ event: "error", message: "Voice runtime is not installed." });
    return;
  }
  const python = process.env.NOVA_PYTHON ?? "python";
  voiceProcess = spawn(python, [servicePath], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  voiceProcess.stdout.setEncoding("utf8");
  voiceProcess.stderr.setEncoding("utf8");
  voiceProcess.stdout.on("data", (data: string) => {
    voiceOutputBuffer += data;
    const lines = voiceOutputBuffer.split("\n");
    voiceOutputBuffer = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const event: unknown = JSON.parse(line);
        if (isRecord(event) && typeof event.event === "string") {
          if (event.event === "ready") {
            voiceReady = true;
            for (const command of queuedVoiceCommands.splice(0)) voiceProcess?.stdin.write(command);
          }
          if (event.event === "wake_word" || event.event === "transcript") {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              if (!mainWindow.isVisible()) mainWindow.show();
              mainWindow.focus();
            }
          }
          sendVoiceEvent(event);
        }
      } catch {
        // Ignore malformed sidecar output; diagnostics are written to stderr.
      }
    }
  });
  voiceProcess.stderr.on("data", (data: string) => console.warn("Voice runtime:", data.trim()));
  voiceProcess.on("error", error => sendVoiceEvent({ event: "error", message: `Voice runtime failed: ${getErrorMessage(error)}` }));
  voiceProcess.on("exit", code => {
    voiceProcess = null;
    voiceReady = false;
    if (code !== 0 && code !== null) sendVoiceEvent({ event: "error", message: `Voice runtime stopped (${code}).` });
  });
}

function stopVoiceService() {
  if (!voiceProcess) return;
  if (voiceProcess.stdin.writable) voiceProcess.stdin.write('{"action":"shutdown"}\n');
  voiceProcess.kill();
  voiceProcess = null;
  voiceReady = false;
  queuedVoiceCommands.length = 0;
}

function isVoiceCommand(value: unknown): value is { action: "start_ptt" | "stop_ptt" | "set_wake_word" | "speak" | "stop_speaking" | "transcribe_pcm" | "transcribe_audio_blob"; enabled?: boolean; text?: string; pcmBase64?: string; audioBase64?: string; mimeType?: string; lang?: string } {
  if (!isRecord(value) || typeof value.action !== "string") return false;
  if (["start_ptt", "stop_ptt", "stop_speaking", "transcribe_pcm", "transcribe_audio_blob"].includes(value.action)) return true;
  if (value.action === "set_wake_word") return typeof value.enabled === "boolean";
  return value.action === "speak" && typeof value.text === "string" && value.text.length <= 20_000;
}

function getProviderErrorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body) || !isRecord(body.error) || typeof body.error.message !== "string") {
    return fallback;
  }
  return body.error.message;
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// Window
function createWindow() {
  const preloadJs = path.join(__dirname, "preload.js");
  const preloadMjs = path.join(__dirname, "preload.mjs");
  const resolvedPreload = fs.existsSync(preloadJs) ? preloadJs : preloadMjs;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: resolvedPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: app.isPackaged,
    },
    backgroundColor: "#08090e",
    show: false,
    title: "Hardeep Assistant",
  });


  const sess = mainWindow.webContents.session;
  sess.setPermissionCheckHandler(() => true);
  sess.setPermissionRequestHandler((_wc, _perm, callback) => callback(true));
  if ((sess as any).setDevicePermissionHandler) {
    (sess as any).setDevicePermissionHandler(() => true);
  }
  if ((sess as any).setDisplayMediaRequestHandler) {
    (sess as any).setDisplayMediaRequestHandler((_request: any, callback: any) => {
      desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
        if (sources.length > 0) {
          callback({ video: sources[0] });
        } else {
          callback({ video: null });
        }
      }).catch(() => callback({ video: null }));
    });
  }


  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Safety fallback if ready-to-show is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 600);

  const distPath = path.join(__dirname, "../dist/index.html");
  if (app.isPackaged) {
    mainWindow.loadFile(distPath);
  } else {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(distPath)) mainWindow?.loadFile(distPath);
    });

    // Fast 1.2s timeout fallback to local build if dev server is unresponsive
    setTimeout(() => {
      if (mainWindow && mainWindow.webContents.getURL() === "") {
        if (fs.existsSync(distPath)) mainWindow.loadFile(distPath);
      }
    }, 1200);
  }

  mainWindow.webContents.on("did-fail-load", () => {
    if (fs.existsSync(distPath)) {
      mainWindow?.loadFile(distPath);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://localhost:") && !url.startsWith("file://")) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
  mainWindow.show();
  mainWindow.focus();

  // Minimize to tray on close to maintain background wake word listening
  mainWindow.on("close", (event) => {
    if (!isAppQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // System Tray Setup
  try {
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#7c3aed"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const icon = nativeImage.createFromBuffer(Buffer.from(iconSvg));
    tray = new Tray(icon);
    tray.setToolTip("Hardeep Assistant (Alt+Space)");

    const contextMenu = Menu.buildFromTemplate([
      { label: "Open Hardeep Assistant", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: "Toggle Window (Alt+Space)", click: toggleWindow },
      { type: "separator" },
      { label: "Quit Nova", click: () => { isAppQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
      toggleWindow();
    });
  } catch (e) {
    console.warn("Tray creation error:", e);
  }

  // Register Global Hotkeys (Ctrl+Space / Alt+Space)
  try {
    globalShortcut.register("CommandOrControl+Space", () => {
      toggleWindow();
    });
    globalShortcut.register("Alt+Space", () => {
      toggleWindow();
    });
  } catch (e) {
    console.warn("Global shortcut registration error:", e);
  }
}

// Single Instance Lock: Prevents duplicate windows from opening
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Focus the existing window if user attempts to launch a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    try {
      session.defaultSession.setPermissionCheckHandler(() => true);
      session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(true);
      });
      if ((session.defaultSession as any).setDevicePermissionHandler) {
        (session.defaultSession as any).setDevicePermissionHandler(() => true);
      }
    } catch (e) {
      console.warn("Session permission setup note:", e);
    }
    createWindow();
    // Defer voice process spawn so Electron window opens instantly
    setTimeout(() => {
      try {
        startVoiceService();
      } catch (err) {
        console.warn("Failed to start voice service on boot:", err);
      }
    }, 200);
  });
}

app.on("will-quit", () => {
  stopVoiceService();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Voice Commands IPC
ipcMain.on("voice:command", (_event, command: unknown) => {
  if (!isVoiceCommand(command)) return;
  startVoiceService();
  writeVoiceCommand(command);
});

// Open external URLs
ipcMain.on("open:external", (_event, value: unknown) => {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      void shell.openExternal(url.toString());
    }
  } catch {
    // Invalid external URLs are ignored.
  }
});

// ─── System Actions Framework ──────────────────────────────────────────────────
type ActionRisk = "safe" | "warning" | "blocked";
type ActionType = "open_app" | "open_website" | "open_file" | "open_folder" | "open_settings";

interface ActionRequest {
  id?: string;
  type: ActionType;
  target: string;
  label?: string;
}

interface ActionLogEntry {
  id: string;
  timestamp: number;
  type: ActionType;
  target: string;
  label?: string;
  risk: ActionRisk;
  status: "success" | "failed" | "blocked" | "cancelled";
  error?: string;
}

const ALLOWED_APPS_SAFE: Record<string, string> = {
  calc: "calc.exe",
  calculator: "calc.exe",
  notepad: "notepad.exe",
  explorer: "explorer.exe",
  paint: "mspaint.exe",
  mspaint: "mspaint.exe",
  taskmgr: "taskmgr.exe",
  taskmanager: "taskmgr.exe",
  edge: "msedge.exe",
  chrome: "chrome.exe",
  code: "code",
  vscode: "code",
};

const ALLOWED_APPS_WARNING: Record<string, string> = {
  cmd: "cmd.exe",
  powershell: "powershell.exe",
  terminal: "wt.exe",
};

const BLOCKED_PATTERNS = [
  /rm\s+-rf/i,
  /format\s+[a-z]:/i,
  /del\s+\/[sfq]/i,
  /rd\s+\/[sq]/i,
  /reg\s+delete/i,
  /regedit/i,
  /system32/i,
  /drop\s+database/i,
  /shutdown/i,
  /diskpart/i,
];

const ACTION_LOGS_FILE = path.join(app.getPath("userData"), "nova-action-logs.json");

function loadActionLogs(): ActionLogEntry[] {
  try {
    if (!fs.existsSync(ACTION_LOGS_FILE)) return [];
    const data = fs.readFileSync(ACTION_LOGS_FILE, "utf8");
    return JSON.parse(data) as ActionLogEntry[];
  } catch {
    return [];
  }
}

function appendActionLog(entry: ActionLogEntry) {
  try {
    const logs = loadActionLogs();
    logs.unshift(entry);
    const trimmed = logs.slice(0, 200); // keep last 200 actions
    fs.writeFileSync(ACTION_LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to write action log:", e);
  }
}

function classifyAction(action: ActionRequest): { risk: ActionRisk; reason: string; executable?: string } {
  const target = (action.target || "").trim();

  // Check for dangerous blocked patterns
  if (BLOCKED_PATTERNS.some(pat => pat.test(target))) {
    return { risk: "blocked", reason: "Action contains potentially dangerous or destructive commands." };
  }

  if (action.type === "open_website") {
    try {
      const url = new URL(target.startsWith("http") ? target : `https://${target}`);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return { risk: "safe", reason: `Open website: ${url.hostname}` };
      }
    } catch {
      return { risk: "blocked", reason: "Invalid website URL." };
    }
  }

  if (action.type === "open_app") {
    const key = target.toLowerCase().replace(/\.exe$/, "").trim();
    if (ALLOWED_APPS_SAFE[key]) {
      return { risk: "safe", reason: `Launch allowlisted desktop application: ${key}`, executable: ALLOWED_APPS_SAFE[key] };
    }
    if (ALLOWED_APPS_WARNING[key]) {
      return { risk: "warning", reason: `Launch system command-line tool: ${key}`, executable: ALLOWED_APPS_WARNING[key] };
    }
    return { risk: "blocked", reason: `Application "${target}" is not on the allowlist.` };
  }

  if (action.type === "open_settings") {
    const normalized = target.startsWith("ms-settings:") ? target : `ms-settings:${target}`;
    return { risk: "safe", reason: `Open Windows Settings: ${normalized}` };
  }

  if (action.type === "open_folder") {
    // Check if target is a standard user directory
    const resolved = path.resolve(target.replace(/^~/, os.homedir()));
    const home = os.homedir();
    if (resolved.startsWith(home)) {
      return { risk: "safe", reason: `Open folder: ${resolved}` };
    }
    return { risk: "warning", reason: `Open external system directory: ${resolved}` };
  }

  if (action.type === "open_file") {
    return { risk: "warning", reason: `Open local file: ${target}` };
  }

  return { risk: "blocked", reason: "Unknown action request." };
}

ipcMain.handle("action:classify", (_event, action: unknown) => {
  if (!isRecord(action) || typeof action.type !== "string" || typeof action.target !== "string") {
    return { risk: "blocked", reason: "Invalid action payload" };
  }
  return classifyAction(action as unknown as ActionRequest);
});

async function executeActionInternal(req: ActionRequest, bypassWarning = false) {
  const classification = classifyAction(req);
  const logId = req.id || crypto.randomUUID();

  if (classification.risk === "blocked") {
    appendActionLog({
      id: logId,
      timestamp: Date.now(),
      type: req.type,
      target: req.target,
      label: req.label,
      risk: "blocked",
      status: "blocked",
      error: classification.reason,
    });
    return { ok: false, risk: "blocked", error: classification.reason };
  }

  if (classification.risk === "warning" && !bypassWarning) {
    return { ok: false, risk: "warning", reason: classification.reason, requiresConfirmation: true };
  }

  try {
    if (req.type === "open_website") {
      const url = req.target.startsWith("http") ? req.target : `https://${req.target}`;
      await shell.openExternal(url);
    } else if (req.type === "open_app") {
      const execName = classification.executable || req.target;
      if (process.platform === "win32") {
        exec(`start "" "${execName}"`);
      } else {
        exec(execName);
      }
    } else if (req.type === "open_settings") {
      const uri = req.target.startsWith("ms-settings:") ? req.target : `ms-settings:${req.target}`;
      await shell.openExternal(uri);
    } else if (req.type === "open_folder" || req.type === "open_file") {
      const resolved = path.resolve(req.target.replace(/^~/, os.homedir()));
      const err = await shell.openPath(resolved);
      if (err) throw new Error(err);
    }

    appendActionLog({
      id: logId,
      timestamp: Date.now(),
      type: req.type,
      target: req.target,
      label: req.label,
      risk: classification.risk,
      status: "success",
    });

    return { ok: true, risk: classification.risk };
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    appendActionLog({
      id: logId,
      timestamp: Date.now(),
      type: req.type,
      target: req.target,
      label: req.label,
      risk: classification.risk,
      status: "failed",
      error: errorMsg,
    });
    return { ok: false, risk: classification.risk, error: errorMsg };
  }
}

ipcMain.handle("action:execute", async (_event, action: unknown, bypassWarning = false) => {
  if (!isRecord(action) || typeof action.type !== "string" || typeof action.target !== "string") {
    return { ok: false, error: "Invalid action request" };
  }
  return executeActionInternal(action as unknown as ActionRequest, bypassWarning);
});

ipcMain.handle("action:logs", () => loadActionLogs());

ipcMain.handle("action:clear-logs", () => {
  try {
    if (fs.existsSync(ACTION_LOGS_FILE)) fs.unlinkSync(ACTION_LOGS_FILE);
    return true;
  } catch {
    return false;
  }
});

// System Info
ipcMain.handle("system:info", () => {
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? "Unknown",
    totalMemGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    freeMemGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(1),
    hostname: os.hostname(),
    uptimeHours: (os.uptime() / 3600).toFixed(1),
    appVersion: app.getVersion() || "1.0.0",
  };
});

ipcMain.on("voice:command", (_event, command: unknown) => {
  if (!isVoiceCommand(command)) {
    sendVoiceEvent({ event: "error", message: "Invalid voice command." });
    return;
  }
  startVoiceService();
  writeVoiceCommand(command);
});

// Settings Storage
const SETTINGS_FILE = path.join(app.getPath("userData"), "nova-settings.enc");
const DEFAULT_SETTINGS: Settings = {
  openaiKey: "",
  geminiKey: "",
  anthropicKey: "",
  ollamaUrl: "http://localhost:11434",
  defaultModel: "qwen2.5-coder:1.5b",
};

function loadSettings(): Settings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
    const data = fs.readFileSync(SETTINGS_FILE);
    if (safeStorage.isEncryptionAvailable()) {
      const json = safeStorage.decryptString(data);
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    } else {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data.toString("utf8")) };
    }
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(settings: Settings) {
  const json = JSON.stringify(settings);
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json);
    fs.writeFileSync(SETTINGS_FILE, encrypted);
  } else {
    fs.writeFileSync(SETTINGS_FILE, json, "utf8");
  }
}

// Real Memory Storage System
const MEMORY_FILE = path.join(app.getPath("userData"), "nova-memory.json");

interface MemoryRecord {
  id: string;
  type: string;
  key: string;
  value: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

function loadMemories(): MemoryRecord[] {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return [];
    const data = fs.readFileSync(MEMORY_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveMemories(memories: MemoryRecord[]) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), "utf8");
  } catch (err) {
    console.error("[MEMORY] Failed to write memory store:", err);
  }
}

function getSafeSettings(): Settings {
  return { ...loadSettings(), openaiKey: "", geminiKey: "", anthropicKey: "" };
}

function isSettingsUpdate(value: unknown): value is Partial<Settings> {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set([
    "openaiKey",
    "geminiKey",
    "anthropicKey",
    "ollamaUrl",
    "defaultModel",
    "systemPrompt",
    "theme",
    "language",
    "wakeWordEnabled",
    "voiceSpeed",
    "autoSpeak",
  ]);
  return Object.entries(value).every(([key, setting]) => {
    if (!allowedKeys.has(key)) return false;
    if (typeof setting === "string") return setting.length <= 20_000;
    if (typeof setting === "boolean") return true;
    if (typeof setting === "number") return !isNaN(setting);
    return false;
  });
}

ipcMain.handle("settings:get", () => getSafeSettings());
ipcMain.handle("settings:set", (_event, update: unknown) => {
  if (!isSettingsUpdate(update)) throw new Error("Invalid settings payload");
  const next = loadSettings();
  for (const [key, value] of Object.entries(update) as Array<[keyof Settings, any]>) {
    if (SECRET_SETTING_KEYS.includes(key as (typeof SECRET_SETTING_KEYS)[number]) && !value) continue;
    if (key === "ollamaUrl" && value && typeof value === "string" && !isLoopbackUrl(value)) {
      throw new Error("Ollama URL must use http(s) on localhost");
    }
    next[key] = value;
  }
  saveSettings(next);
  return getSafeSettings();
});

// Ollama: list local models
ipcMain.handle("ollama:models", async (_event, url: unknown = "http://localhost:11434") => {
  if (!isLoopbackUrl(url)) return [];
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json() as { models?: Array<{ name: string }> };
    return data.models?.map(m => m.name) ?? [];
  } catch { return []; }
});

// Connection Test
ipcMain.handle("settings:test", async (_event, provider: unknown, key: unknown, ollamaUrl: unknown = "http://localhost:11434") => {
  if (!isProvider(provider)) return { ok: false, error: "Unknown provider" };
  if (typeof key !== "string" || key.length > 2_000) return { ok: false, error: "Invalid API key" };
  if (provider === "ollama" && !isLoopbackUrl(ollamaUrl)) {
    return { ok: false, error: "Ollama URL must use http(s) on localhost" };
  }
  try {
    if (provider === "ollama") {
      const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return { ok: false, error: "Ollama not reachable" };
      const data = await res.json() as { models?: Array<{ name: string }> };
      const count = data.models?.length ?? 0;
      return { ok: true, error: count === 0 ? "Connected but no models installed. Run: ollama pull llama3.2" : undefined };
    }
    const settings = loadSettings();
    let res: Response;
    if (provider === "openai") {
      res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key || settings.openaiKey}` } });
    } else if (provider === "gemini") {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key || settings.geminiKey}`);
    } else if (provider === "anthropic") {
      res = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": key || settings.anthropicKey, "anthropic-version": "2023-06-01" },
      });
    } else {
      return { ok: false, error: "Unknown provider" };
    }
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => ({}));
      return { ok: false, error: getProviderErrorMessage(body, res.statusText) };
    }
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: getErrorMessage(error) };
  }
});

async function streamOpenAI(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, apiKey: string, baseUrl = "https://api.openai.com", systemPrompt?: string) {
  if (!apiKey) {
    throw new Error("OpenAI API key is missing. Please add your OpenAI API key in Settings (⚙️).");
  }
  const formattedMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: formattedMessages, stream: true }),
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const chunk: string = json.choices?.[0]?.delta?.content ?? "";
        if (chunk) { fullText += chunk; event.sender.send("chat:chunk", chunk); }
      } catch {
        // Ignore malformed SSE frames and wait for the next complete frame.
      }
    }
  }
  event.sender.send("chat:done", fullText);
}

async function streamGemini(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, apiKey: string, systemPrompt?: string) {
  if (!apiKey) {
    throw new Error("Google Gemini API key is missing. Please add your Gemini API key in Settings (⚙️).");
  }
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const bodyPayload: Record<string, unknown> = { contents };
  if (systemPrompt) {
    bodyPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bodyPayload) }
  );
  if (!res.ok) {
    if (res.status === 429) {
      console.warn("[AI FALLBACK] Gemini Rate Limit Exceeded (HTTP 429). Falling back to local Ollama llama3.2 engine.");
      return streamOllama(event, messages, "llama3.2", "http://localhost:11434", systemPrompt);
    }
    const body: unknown = await res.json().catch(() => ({}));
    throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const json = JSON.parse(line.slice(6).trim());
        const chunk: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (chunk) { fullText += chunk; event.sender.send("chat:chunk", chunk); }
      } catch {
        // Ignore malformed SSE frames and wait for the next complete frame.
      }
    }
  }
  event.sender.send("chat:done", fullText);
}

async function streamAnthropic(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, apiKey: string, systemPrompt?: string) {
  if (!apiKey) {
    throw new Error("Anthropic API key is missing. Please add your Anthropic API key in Settings (⚙️).");
  }
  const bodyPayload: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    max_tokens: 4096,
  };
  if (systemPrompt) {
    bodyPayload.system = systemPrompt;
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const json = JSON.parse(line.slice(6).trim());
        if (json.type === "content_block_delta") {
          const chunk: string = json.delta?.text ?? "";
          if (chunk) { fullText += chunk; event.sender.send("chat:chunk", chunk); }
        }
      } catch {
        // Ignore malformed SSE frames and wait for the next complete frame.
      }
    }
  }
  event.sender.send("chat:done", fullText);
}

async function streamOllama(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, baseUrl = "http://localhost:11434", systemPrompt?: string) {
  const formattedMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: formattedMessages, stream: true }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new Error(
      `Could not connect to Ollama at ${baseUrl}. Please ensure Ollama is running, or add your Gemini / OpenAI API key in Settings (⚙️) to use cloud AI.`
    );
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    if (res.status === 404) {
      throw new Error(
        `Model "${model}" was not found in Ollama. Please run "ollama pull ${model}" in your terminal, or select an installed model from the model selector.`
      );
    }
    throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line.trim());
        const chunk: string = json.message?.content ?? "";
        if (chunk) { fullText += chunk; event.sender.send("chat:chunk", chunk); }
      } catch {
        // Ignore malformed newline-delimited JSON frames.
      }
    }
  }
  event.sender.send("chat:done", fullText);
}

// Chat IPC handler
ipcMain.on("chat:send", async (event, payload: unknown) => {
  if (!isRecord(payload) || !isChatMessages(payload.messages) || !isProvider(payload.provider) ||
    typeof payload.model !== "string" || payload.model.length === 0 || payload.model.length > 256 ||
    !isLoopbackUrl(payload.ollamaUrl ?? "http://localhost:11434")) {
    event.sender.send("chat:error", "Invalid chat request");
    return;
  }
  const { messages, model, provider } = payload;
  const rawSystemPrompt = typeof payload.systemPrompt === "string" ? payload.systemPrompt : undefined;
  const indicInstruction = "CRITICAL LANGUAGE INSTRUCTION: When responding in Punjabi, use 100% authentic, fluent, and grammatically correct Gurmukhi script (ਪੰਜਾਬੀ). When responding in Hindi, use 100% authentic Devanagari script (हिन्दी). Never output garbled or corrupted characters.";
  const systemPrompt = rawSystemPrompt ? `${rawSystemPrompt}\n\n${indicInstruction}` : indicInstruction;

  const ollamaUrl = typeof payload.ollamaUrl === "string" ? payload.ollamaUrl : "http://localhost:11434";
  const settings = loadSettings();
  const geminiKey = settings.geminiKey;

  const lastUserMsg = messages.filter(m => m.role === "user").pop()?.content || "";
  const isIndicQuery = /[\u0900-\u097F\u0A00-\u0A7F]/.test(lastUserMsg) || /\b(punjabi|hindi|gurmukhi|devanagari)\b/i.test(lastUserMsg);

  try {
    // If user requests Punjabi/Hindi text while using a small 1.5B coding model, auto-route to Gemini for authentic native script if key available
    if (provider === "ollama" && isIndicQuery && geminiKey) {
      console.log("[AI ROUTER] Routing Punjabi/Hindi request to Gemini 2.0 Flash for authentic script generation");
      await streamGemini(event, messages, "gemini-2.0-flash", geminiKey, systemPrompt);
      return;
    }

    if (provider === "ollama") {
      await streamOllama(event, messages, model, ollamaUrl, systemPrompt);
    } else if (provider === "openai") {
      await streamOpenAI(event, messages, model, settings.openaiKey, undefined, systemPrompt);
    } else if (provider === "gemini") {
      if (!geminiKey) {
        console.log("[AI ROUTER] No Gemini key configured. Silently routing to local Ollama llama3.2.");
        await streamOllama(event, messages, "llama3.2", ollamaUrl, systemPrompt);
        return;
      }
      try {
        await streamGemini(event, messages, model, geminiKey, systemPrompt);
      } catch (geminiError) {
        console.warn("[AI ROUTER] Gemini rate-limit or key error. Silently streaming via local Ollama llama3.2:", geminiError);
        await streamOllama(event, messages, "llama3.2", ollamaUrl, systemPrompt);
      }
    } else if (provider === "anthropic") {
      await streamAnthropic(event, messages, model, settings.anthropicKey, systemPrompt);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error: unknown) {
    if (!event.sender.isDestroyed()) event.sender.send("chat:error", getErrorMessage(error));
  }
});

// Memory IPC Handlers
ipcMain.handle("memory:get", (_e, type?: string) => {
  const memories = loadMemories();
  if (type) return memories.filter(m => m.type === type);
  return memories;
});

ipcMain.handle("memory:save", (_e, item: Partial<MemoryRecord>) => {
  const memories = loadMemories();
  const now = Date.now();
  const id = item.id || crypto.randomUUID();
  const existingIdx = memories.findIndex(m => m.id === id || (m.key.toLowerCase() === (item.key || "").toLowerCase() && m.type === (item.type || "long_term")));
  
  const record: MemoryRecord = {
    id: existingIdx >= 0 ? memories[existingIdx].id : id,
    type: item.type || "long_term",
    key: item.key || "General Fact",
    value: item.value || "",
    category: item.category || "General",
    createdAt: existingIdx >= 0 ? memories[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    memories[existingIdx] = record;
  } else {
    memories.push(record);
  }
  saveMemories(memories);
  return record;
});

ipcMain.handle("memory:delete", (_e, id: string) => {
  const memories = loadMemories();
  const updated = memories.filter(m => m.id !== id);
  saveMemories(updated);
  return true;
});

ipcMain.handle("memory:clear", (_e, type?: string) => {
  if (type) {
    const memories = loadMemories().filter(m => m.type !== type);
    saveMemories(memories);
  } else {
    saveMemories([]);
  }
  return true;
});

// Tool Execution IPC Handler with Security Tiers
ipcMain.handle("tool:execute", async (_e, request: { tool: string; arguments: Record<string, unknown> }, bypassConfirmation?: boolean) => {
  const tool = request.tool;
  const args = request.arguments || {};

  console.log(`[TOOL IPC] Requesting tool execution: ${tool}`, args);

  // Determine Security Tier
  const safeTools = new Set(["system.info", "file.read", "clipboard.read"]);
  const isSafe = safeTools.has(tool);
  const securityTier = isSafe ? "safe" : "confirmation_required";

  if (!isSafe && !bypassConfirmation) {
    return {
      success: false,
      requiresConfirmation: true,
      securityTier,
      reason: `Tool '${tool}' requires confirmation before execution.`,
    };
  }

  try {
    if (tool === "application.open") {
      const appName = String(args.name || "");
      return await executeActionInternal({ type: "open_app", target: appName }, true);
    }

    if (tool === "browser.open") {
      const url = String(args.url || "");
      return await executeActionInternal({ type: "open_website", target: url }, true);
    }

    if (tool === "folder.create") {
      const folderPath = String(args.path || "");
      const fullPath = path.isAbsolute(folderPath) ? folderPath : path.join(app.getPath("desktop"), folderPath);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return { success: true, result: `Folder created at ${fullPath}`, securityTier };
    }

    if (tool === "file.create") {
      const filePath = String(args.path || "");
      const content = String(args.content || "");
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(app.getPath("desktop"), filePath);
      fs.writeFileSync(fullPath, content, "utf8");
      return { success: true, result: `File created at ${fullPath}`, securityTier };
    }

    if (tool === "file.read") {
      const filePath = String(args.path || "");
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const data = fs.readFileSync(filePath, "utf8");
      return { success: true, result: data.slice(0, 10000), securityTier };
    }

    if (tool === "system.info") {
      const info = {
        platform: process.platform,
        cpus: os.cpus().length,
        totalMemGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
        freeMemGB: (os.freemem() / (1024 * 1024 * 1024)).toFixed(2),
        uptimeHours: (os.uptime() / 3600).toFixed(1),
        hostname: os.hostname(),
      };
      return { success: true, result: info, securityTier };
    }

    if (tool === "clipboard.read") {
      const text = safeStorage.isEncryptionAvailable() ? require("electron").clipboard.readText() : "";
      return { success: true, result: text || "Clipboard content accessed", securityTier };
    }

    throw new Error(`Unknown tool: ${tool}`);
  } catch (err: any) {
    return { success: false, error: err.message || String(err), securityTier };
  }
});

// Terminal Command Execution IPC Handler
ipcMain.handle("terminal:execute", async (_e, payload: { command: string; cwd?: string; timeoutMs?: number }) => {
  const { command, cwd = process.cwd(), timeoutMs = 30000 } = payload;
  const startTime = Date.now();

  return new Promise(resolve => {
    exec(command, { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      if (error) {
        resolve({
          success: false,
          exitCode: error.code ?? 1,
          stdout: stdout ? stdout.toString() : "",
          stderr: stderr ? stderr.toString() : error.message,
          durationMs,
        });
      } else {
        resolve({
          success: true,
          exitCode: 0,
          stdout: stdout.toString(),
          stderr: stderr ? stderr.toString() : "",
          durationMs,
        });
      }
    });
  });
});

// Git IPC Handlers
ipcMain.handle("git:status", async (_e, cwd?: string) => {
  const targetCwd = cwd || process.cwd();
  return new Promise(resolve => {
    exec("git status --porcelain -b", { cwd: targetCwd }, (err, stdout) => {
      if (err) resolve({ success: false, isGit: false, error: err.message });
      else {
        const lines = stdout.split("\n").filter(Boolean);
        const branchLine = lines.find(l => l.startsWith("##")) || "## main";
        const branch = branchLine.replace("##", "").trim().split("...")[0];
        const files = lines.filter(l => !l.startsWith("##")).map(l => ({
          status: l.slice(0, 2).trim(),
          path: l.slice(3).trim(),
        }));
        resolve({ success: true, isGit: true, branch, files });
      }
    });
  });
});

ipcMain.handle("git:diff", async (_e, cwd?: string) => {
  const targetCwd = cwd || process.cwd();
  return new Promise(resolve => {
    exec("git diff", { cwd: targetCwd, maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
      if (err) resolve({ success: false, diff: "" });
      else resolve({ success: true, diff: stdout });
    });
  });
});

ipcMain.handle("git:commit", async (_e, message: string, cwd?: string) => {
  const targetCwd = cwd || process.cwd();
  return new Promise(resolve => {
    const escapedMsg = message.replace(/"/g, '\\"');
    exec(`git add . && git commit -m "${escapedMsg}"`, { cwd: targetCwd }, (err, stdout, stderr) => {
      if (err) resolve({ success: false, error: stderr || err.message });
      else resolve({ success: true, output: stdout });
    });
  });
});

// Hardware Metrics IPC Handler
ipcMain.handle("system:hardware", async () => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryUsage = process.memoryUsage();

  return {
    platform: process.platform,
    arch: process.arch,
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model || "Generic CPU",
    totalMemGB: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
    freeMemGB: (freeMem / (1024 * 1024 * 1024)).toFixed(2),
    usedMemGB: ((totalMem - freeMem) / (1024 * 1024 * 1024)).toFixed(2),
    memUsagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    processRssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
    processHeapMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
    uptimeHours: (os.uptime() / 3600).toFixed(1),
  };
});

// Ollama Pull & Delete Models IPC Handlers
ipcMain.handle("ollama:pull", async (_e, modelName: string, url = "http://localhost:11434") => {
  try {
    const res = await fetch(`${url}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName, stream: false }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle("ollama:delete", async (_e, modelName: string, url = "http://localhost:11434") => {
  try {
    const res = await fetch(`${url}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

// Workspace & Code Intelligence IPC Handlers
ipcMain.handle("workspace:select", async () => {
  return await selectWorkspaceDirectory();
});

ipcMain.handle("workspace:tree", async (_e, rootPath: string) => {
  try {
    if (!rootPath || !fs.existsSync(rootPath)) {
      return { success: false, error: "Path does not exist" };
    }
    const { tree, metadata } = buildWorkspaceTree(rootPath);
    return { success: true, tree, metadata };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle("workspace:read-file", async (_e, filePath: string) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    const content = fs.readFileSync(filePath, "utf8");
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle("workspace:write-file", async (_e, filePath: string, newContent: string) => {
  try {
    let oldContent = "";
    if (fs.existsSync(filePath)) {
      oldContent = fs.readFileSync(filePath, "utf8");
    }
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, newContent, "utf8");
    const diff = computeFileDiff(filePath, oldContent, newContent);
    return { success: true, diff };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle("workspace:delete-file", async (_e, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle("workspace:search-code", async (_e, query: string, rootPath: string) => {
  try {
    const results = searchCodebase(query, rootPath);
    return { success: true, results };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

// Web Search IPC Handler
ipcMain.handle("web:search", async (_e, query: string) => {
  try {
    const results = await performWebSearch(query);
    return { success: true, results };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

// Document Intelligence IPC Handler
ipcMain.handle("document:parse", async (_e, filePath: string) => {
  try {
    const result = parseDocumentFile(filePath);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

// Local Model Benchmark IPC Handler
ipcMain.handle("model:benchmark", async (_e, modelId: string, url?: string) => {
  try {
    const result = await benchmarkModel(modelId, url);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

// Audio File Intelligence IPC Handler
ipcMain.handle("audio:parse", async (_e, filePath: string) => {
  try {
    const result = parseAudioFile(filePath);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});

// Desktop Screen & Window Capture IPC Handlers
ipcMain.handle("screen:get-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 640, height: 360 },
      fetchWindowIcons: true,
    });
    return {
      success: true,
      sources: sources.map(s => ({
        id: s.id,
        name: s.name,
        displayId: s.display_id,
        thumbnail: s.thumbnail.toDataURL(),
        appIcon: s.appIcon ? s.appIcon.toDataURL() : undefined,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err), sources: [] };
  }
});

ipcMain.handle("screen:capture-frame", async (_e, payload?: { sourceId?: string; width?: number; height?: number }) => {
  try {
    const requestedId = payload?.sourceId;
    const width = payload?.width || 1920;
    const height = payload?.height || 1080;

    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width, height },
    });

    let target = sources.find(s => s.id === requestedId);
    if (!target && sources.length > 0) {
      target = sources[0]; // fallback to primary screen
    }

    if (!target) {
      return { success: false, error: "No screen or window source available" };
    }

    const dataUrl = target.thumbnail.toDataURL();
    const base64Data = dataUrl.split(",")[1] || "";
    return {
      success: true,
      dataUrl,
      base64Data,
      mimeType: "image/png",
      sourceId: target.id,
      sourceName: target.name,
      timestamp: Date.now(),
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
});





