import { app, BrowserWindow, ipcMain, safeStorage, shell, globalShortcut, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

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
const EXTERNAL_HOSTS = new Set(["platform.openai.com", "aistudio.google.com", "console.anthropic.com", "ollama.com"]);

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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    backgroundColor: "#08090e",
    show: false,
    title: "Hardeep Assistant",
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173");
  }
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", event => event.preventDefault());
  mainWindow.once("ready-to-show", () => { mainWindow?.show(); });

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
      { label: "Quit", click: () => { app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
      toggleWindow();
    });
  } catch (e) {
    console.warn("Tray creation error:", e);
  }

  // Register Global Hotkey Alt+Space
  try {
    const registered = globalShortcut.register("Alt+Space", () => {
      toggleWindow();
    });
    if (!registered) {
      globalShortcut.register("CommandOrControl+Shift+Space", () => {
        toggleWindow();
      });
    }
  } catch (e) {
    console.warn("Global shortcut registration error:", e);
  }
}

app.whenReady().then(createWindow);

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Open external URLs (for API key links)
ipcMain.on("open:external", (_event, value: unknown) => {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && EXTERNAL_HOSTS.has(url.hostname)) {
      void shell.openExternal(url.toString());
    }
  } catch {
    // Invalid external URLs are ignored.
  }
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

function getSafeSettings(): Settings {
  return { ...loadSettings(), openaiKey: "", geminiKey: "", anthropicKey: "" };
}

function isSettingsUpdate(value: unknown): value is Partial<Settings> {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set(["openaiKey", "geminiKey", "anthropicKey", "ollamaUrl", "defaultModel"]);
  return Object.entries(value).every(([key, setting]) =>
    allowedKeys.has(key) && typeof setting === "string" && setting.length <= 2_000
  );
}

ipcMain.handle("settings:get", () => getSafeSettings());
ipcMain.handle("settings:set", (_event, update: unknown) => {
  if (!isSettingsUpdate(update)) throw new Error("Invalid settings payload");
  const next = loadSettings();
  for (const [key, value] of Object.entries(update) as Array<[keyof Settings, string]>) {
    if (SECRET_SETTING_KEYS.includes(key as (typeof SECRET_SETTING_KEYS)[number]) && !value) continue;
    if (key === "ollamaUrl" && value && !isLoopbackUrl(value)) {
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

async function streamOpenAI(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, apiKey: string, baseUrl = "https://api.openai.com") {
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
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

async function streamGemini(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, apiKey: string) {
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents }) }
  );
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
        const chunk: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (chunk) { fullText += chunk; event.sender.send("chat:chunk", chunk); }
      } catch {
        // Ignore malformed SSE frames and wait for the next complete frame.
      }
    }
  }
  event.sender.send("chat:done", fullText);
}

async function streamAnthropic(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 4096 }),
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

async function streamOllama(event: Electron.IpcMainEvent, messages: ChatMessage[], model: string, baseUrl = "http://localhost:11434") {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
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
  const ollamaUrl = typeof payload.ollamaUrl === "string" ? payload.ollamaUrl : "http://localhost:11434";
  const settings = loadSettings();
  try {
    if (provider === "ollama") {
      await streamOllama(event, messages, model, ollamaUrl);
    } else if (provider === "openai") {
      await streamOpenAI(event, messages, model, settings.openaiKey);
    } else if (provider === "gemini") {
      await streamGemini(event, messages, model, settings.geminiKey);
    } else if (provider === "anthropic") {
      await streamAnthropic(event, messages, model, settings.anthropicKey);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error: unknown) {
    if (!event.sender.isDestroyed()) event.sender.send("chat:error", getErrorMessage(error));
  }
});
