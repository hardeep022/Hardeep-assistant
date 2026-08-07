let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("nova", {
	sendMessage: (payload) => {
		electron.ipcRenderer.send("chat:send", payload);
	},
	onChunk: (fn) => {
		electron.ipcRenderer.on("chat:chunk", (_e, chunk) => fn(chunk));
	},
	onDone: (fn) => {
		electron.ipcRenderer.once("chat:done", (_e, text) => fn(text));
	},
	onError: (fn) => {
		electron.ipcRenderer.once("chat:error", (_e, err) => fn(err));
	},
	clearListeners: () => {
		electron.ipcRenderer.removeAllListeners("chat:chunk");
		electron.ipcRenderer.removeAllListeners("chat:done");
		electron.ipcRenderer.removeAllListeners("chat:error");
	},
	getSettings: () => electron.ipcRenderer.invoke("settings:get"),
	setSettings: (settings) => electron.ipcRenderer.invoke("settings:set", settings),
	testConnection: (provider, key, ollamaUrl) => electron.ipcRenderer.invoke("settings:test", provider, key, ollamaUrl),
	getOllamaModels: (url) => electron.ipcRenderer.invoke("ollama:models", url),
	openExternal: (url) => {
		electron.ipcRenderer.send("open:external", url);
	},
	voiceCommand: (command) => {
		electron.ipcRenderer.send("voice:command", command);
	},
	onVoiceEvent: (fn) => {
		const listener = (_event, payload) => fn(payload);
		electron.ipcRenderer.on("voice:event", listener);
		return () => electron.ipcRenderer.removeListener("voice:event", listener);
	}
});
//#endregion
