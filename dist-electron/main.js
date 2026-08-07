import { BrowserWindow, Menu, Tray, app, globalShortcut, ipcMain, nativeImage, safeStorage, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { spawn } from "node:child_process";
//#region electron/main.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var mainWindow = null;
var tray = null;
var voiceProcess = null;
var voiceReady = false;
var voiceOutputBuffer = "";
var queuedVoiceCommands = [];
var PROVIDERS = /* @__PURE__ */ new Set([
	"openai",
	"gemini",
	"anthropic",
	"ollama"
]);
var SECRET_SETTING_KEYS = [
	"openaiKey",
	"geminiKey",
	"anthropicKey"
];
var EXTERNAL_HOSTS = /* @__PURE__ */ new Set([
	"platform.openai.com",
	"aistudio.google.com",
	"console.anthropic.com",
	"ollama.com"
]);
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function isProvider(value) {
	return typeof value === "string" && PROVIDERS.has(value);
}
function isLoopbackUrl(value) {
	if (typeof value !== "string" || value.length > 512) return false;
	try {
		const url = new URL(value);
		return (url.protocol === "http:" || url.protocol === "https:") && [
			"localhost",
			"127.0.0.1",
			"::1"
		].includes(url.hostname);
	} catch {
		return false;
	}
}
function isChatMessages(value) {
	return Array.isArray(value) && value.length <= 100 && value.every((message) => isRecord(message) && (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.length <= 1e5);
}
function getErrorMessage(error) {
	return error instanceof Error ? error.message : "Unexpected error";
}
function sendVoiceEvent(event) {
	if (!mainWindow || mainWindow.isDestroyed()) return;
	mainWindow.webContents.send("voice:event", event);
}
function getVoiceServicePath() {
	return app.isPackaged ? path.join(process.resourcesPath, "voice", "voice_service.py") : path.join(__dirname, "../voice/voice_service.py");
}
function writeVoiceCommand(command) {
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
		sendVoiceEvent({
			event: "error",
			message: "Voice runtime is not installed."
		});
		return;
	}
	const python = process.env.NOVA_PYTHON ?? "python";
	voiceProcess = spawn(python, [servicePath], {
		stdio: [
			"pipe",
			"pipe",
			"pipe"
		],
		windowsHide: true
	});
	voiceProcess.stdout.setEncoding("utf8");
	voiceProcess.stderr.setEncoding("utf8");
	voiceProcess.stdout.on("data", (data) => {
		voiceOutputBuffer += data;
		const lines = voiceOutputBuffer.split("\n");
		voiceOutputBuffer = lines.pop() ?? "";
		for (const line of lines) try {
			const event = JSON.parse(line);
			if (isRecord(event) && typeof event.event === "string") {
				if (event.event === "ready") {
					voiceReady = true;
					for (const command of queuedVoiceCommands.splice(0)) voiceProcess?.stdin.write(command);
				}
				sendVoiceEvent(event);
			}
		} catch {}
	});
	voiceProcess.stderr.on("data", (data) => console.warn("Voice runtime:", data.trim()));
	voiceProcess.on("error", (error) => sendVoiceEvent({
		event: "error",
		message: `Voice runtime failed: ${getErrorMessage(error)}`
	}));
	voiceProcess.on("exit", (code) => {
		voiceProcess = null;
		voiceReady = false;
		if (code !== 0 && code !== null) sendVoiceEvent({
			event: "error",
			message: `Voice runtime stopped (${code}).`
		});
	});
}
function stopVoiceService() {
	if (!voiceProcess) return;
	if (voiceProcess.stdin.writable) voiceProcess.stdin.write("{\"action\":\"shutdown\"}\n");
	voiceProcess.kill();
	voiceProcess = null;
	voiceReady = false;
	queuedVoiceCommands.length = 0;
}
function isVoiceCommand(value) {
	if (!isRecord(value) || typeof value.action !== "string") return false;
	if ([
		"start_ptt",
		"stop_ptt",
		"stop_speaking"
	].includes(value.action)) return true;
	if (value.action === "set_wake_word") return typeof value.enabled === "boolean";
	return value.action === "speak" && typeof value.text === "string" && value.text.length <= 2e4;
}
function getProviderErrorMessage(body, fallback) {
	if (!isRecord(body) || !isRecord(body.error) || typeof body.error.message !== "string") return fallback;
	return body.error.message;
}
function toggleWindow() {
	if (!mainWindow) return;
	if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
	else {
		mainWindow.show();
		mainWindow.focus();
	}
}
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
			webSecurity: true
		},
		backgroundColor: "#08090e",
		show: false,
		title: "Hardeep Assistant"
	});
	if (app.isPackaged) mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
	else mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173");
	mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
	mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
	});
	try {
		const icon = nativeImage.createFromBuffer(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#7c3aed"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`));
		tray = new Tray(icon);
		tray.setToolTip("Hardeep Assistant (Alt+Space)");
		const contextMenu = Menu.buildFromTemplate([
			{
				label: "Open Hardeep Assistant",
				click: () => {
					mainWindow?.show();
					mainWindow?.focus();
				}
			},
			{
				label: "Toggle Window (Alt+Space)",
				click: toggleWindow
			},
			{ type: "separator" },
			{
				label: "Quit",
				click: () => {
					app.quit();
				}
			}
		]);
		tray.setContextMenu(contextMenu);
		tray.on("click", () => {
			toggleWindow();
		});
	} catch (e) {
		console.warn("Tray creation error:", e);
	}
	try {
		if (!globalShortcut.register("Alt+Space", () => {
			toggleWindow();
		})) globalShortcut.register("CommandOrControl+Shift+Space", () => {
			toggleWindow();
		});
	} catch (e) {
		console.warn("Global shortcut registration error:", e);
	}
}
app.whenReady().then(createWindow);
app.on("will-quit", () => {
	stopVoiceService();
	globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
ipcMain.on("open:external", (_event, value) => {
	if (typeof value !== "string") return;
	try {
		const url = new URL(value);
		if (url.protocol === "https:" && EXTERNAL_HOSTS.has(url.hostname)) shell.openExternal(url.toString());
	} catch {}
});
ipcMain.on("voice:command", (_event, command) => {
	if (!isVoiceCommand(command)) {
		sendVoiceEvent({
			event: "error",
			message: "Invalid voice command."
		});
		return;
	}
	startVoiceService();
	writeVoiceCommand(command);
});
var SETTINGS_FILE = path.join(app.getPath("userData"), "nova-settings.enc");
var DEFAULT_SETTINGS = {
	openaiKey: "",
	geminiKey: "",
	anthropicKey: "",
	ollamaUrl: "http://localhost:11434",
	defaultModel: "qwen2.5-coder:1.5b"
};
function loadSettings() {
	try {
		if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
		const data = fs.readFileSync(SETTINGS_FILE);
		if (safeStorage.isEncryptionAvailable()) {
			const json = safeStorage.decryptString(data);
			return {
				...DEFAULT_SETTINGS,
				...JSON.parse(json)
			};
		} else return {
			...DEFAULT_SETTINGS,
			...JSON.parse(data.toString("utf8"))
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}
function saveSettings(settings) {
	const json = JSON.stringify(settings);
	if (safeStorage.isEncryptionAvailable()) {
		const encrypted = safeStorage.encryptString(json);
		fs.writeFileSync(SETTINGS_FILE, encrypted);
	} else fs.writeFileSync(SETTINGS_FILE, json, "utf8");
}
function getSafeSettings() {
	return {
		...loadSettings(),
		openaiKey: "",
		geminiKey: "",
		anthropicKey: ""
	};
}
function isSettingsUpdate(value) {
	if (!isRecord(value)) return false;
	const allowedKeys = /* @__PURE__ */ new Set([
		"openaiKey",
		"geminiKey",
		"anthropicKey",
		"ollamaUrl",
		"defaultModel"
	]);
	return Object.entries(value).every(([key, setting]) => allowedKeys.has(key) && typeof setting === "string" && setting.length <= 2e3);
}
ipcMain.handle("settings:get", () => getSafeSettings());
ipcMain.handle("settings:set", (_event, update) => {
	if (!isSettingsUpdate(update)) throw new Error("Invalid settings payload");
	const next = loadSettings();
	for (const [key, value] of Object.entries(update)) {
		if (SECRET_SETTING_KEYS.includes(key) && !value) continue;
		if (key === "ollamaUrl" && value && !isLoopbackUrl(value)) throw new Error("Ollama URL must use http(s) on localhost");
		next[key] = value;
	}
	saveSettings(next);
	return getSafeSettings();
});
ipcMain.handle("ollama:models", async (_event, url = "http://localhost:11434") => {
	if (!isLoopbackUrl(url)) return [];
	try {
		const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3e3) });
		if (!res.ok) return [];
		return (await res.json()).models?.map((m) => m.name) ?? [];
	} catch {
		return [];
	}
});
ipcMain.handle("settings:test", async (_event, provider, key, ollamaUrl = "http://localhost:11434") => {
	if (!isProvider(provider)) return {
		ok: false,
		error: "Unknown provider"
	};
	if (typeof key !== "string" || key.length > 2e3) return {
		ok: false,
		error: "Invalid API key"
	};
	if (provider === "ollama" && !isLoopbackUrl(ollamaUrl)) return {
		ok: false,
		error: "Ollama URL must use http(s) on localhost"
	};
	try {
		if (provider === "ollama") {
			const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(4e3) });
			if (!res.ok) return {
				ok: false,
				error: "Ollama not reachable"
			};
			return {
				ok: true,
				error: ((await res.json()).models?.length ?? 0) === 0 ? "Connected but no models installed. Run: ollama pull llama3.2" : void 0
			};
		}
		const settings = loadSettings();
		let res;
		if (provider === "openai") res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key || settings.openaiKey}` } });
		else if (provider === "gemini") res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key || settings.geminiKey}`);
		else if (provider === "anthropic") res = await fetch("https://api.anthropic.com/v1/models", { headers: {
			"x-api-key": key || settings.anthropicKey,
			"anthropic-version": "2023-06-01"
		} });
		else return {
			ok: false,
			error: "Unknown provider"
		};
		if (!res.ok) return {
			ok: false,
			error: getProviderErrorMessage(await res.json().catch(() => ({})), res.statusText)
		};
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: getErrorMessage(error)
		};
	}
});
async function streamOpenAI(event, messages, model, apiKey, baseUrl = "https://api.openai.com") {
	const res = await fetch(`${baseUrl}/v1/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model,
			messages,
			stream: true
		})
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
	}
	const reader = res.body.getReader();
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
				const chunk = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
				if (chunk) {
					fullText += chunk;
					event.sender.send("chat:chunk", chunk);
				}
			} catch {}
		}
	}
	event.sender.send("chat:done", fullText);
}
async function streamGemini(event, messages, model, apiKey) {
	const contents = messages.map((m) => ({
		role: m.role === "assistant" ? "model" : "user",
		parts: [{ text: m.content }]
	}));
	const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ contents })
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
	}
	const reader = res.body.getReader();
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
				const chunk = JSON.parse(line.slice(6).trim()).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
				if (chunk) {
					fullText += chunk;
					event.sender.send("chat:chunk", chunk);
				}
			} catch {}
		}
	}
	event.sender.send("chat:done", fullText);
}
async function streamAnthropic(event, messages, model, apiKey) {
	const res = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model,
			messages,
			stream: true,
			max_tokens: 4096
		})
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
	}
	const reader = res.body.getReader();
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
					const chunk = json.delta?.text ?? "";
					if (chunk) {
						fullText += chunk;
						event.sender.send("chat:chunk", chunk);
					}
				}
			} catch {}
		}
	}
	event.sender.send("chat:done", fullText);
}
async function streamOllama(event, messages, model, baseUrl = "http://localhost:11434") {
	const res = await fetch(`${baseUrl}/api/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model,
			messages,
			stream: true
		})
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(getProviderErrorMessage(body, `HTTP ${res.status}`));
	}
	const reader = res.body.getReader();
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
				const chunk = JSON.parse(line.trim()).message?.content ?? "";
				if (chunk) {
					fullText += chunk;
					event.sender.send("chat:chunk", chunk);
				}
			} catch {}
		}
	}
	event.sender.send("chat:done", fullText);
}
ipcMain.on("chat:send", async (event, payload) => {
	if (!isRecord(payload) || !isChatMessages(payload.messages) || !isProvider(payload.provider) || typeof payload.model !== "string" || payload.model.length === 0 || payload.model.length > 256 || !isLoopbackUrl(payload.ollamaUrl ?? "http://localhost:11434")) {
		event.sender.send("chat:error", "Invalid chat request");
		return;
	}
	const { messages, model, provider } = payload;
	const ollamaUrl = typeof payload.ollamaUrl === "string" ? payload.ollamaUrl : "http://localhost:11434";
	const settings = loadSettings();
	try {
		if (provider === "ollama") await streamOllama(event, messages, model, ollamaUrl);
		else if (provider === "openai") await streamOpenAI(event, messages, model, settings.openaiKey);
		else if (provider === "gemini") await streamGemini(event, messages, model, settings.geminiKey);
		else if (provider === "anthropic") await streamAnthropic(event, messages, model, settings.anthropicKey);
		else throw new Error(`Unknown provider: ${provider}`);
	} catch (error) {
		if (!event.sender.isDestroyed()) event.sender.send("chat:error", getErrorMessage(error));
	}
});
//#endregion
export {};
