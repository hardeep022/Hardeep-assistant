import { contextBridge, ipcRenderer } from "electron";

type Provider = 'openai' | 'gemini' | 'anthropic' | 'ollama';
interface Settings { openaiKey: string; geminiKey: string; anthropicKey: string; ollamaUrl: string; defaultModel: string; }
interface ChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model: string;
  provider: Provider;
  ollamaUrl?: string;
}

contextBridge.exposeInMainWorld("nova", {
  // Chat
  sendMessage: (payload: ChatPayload) => { ipcRenderer.send("chat:send", payload); },
  onChunk: (fn: (chunk: string) => void) => { ipcRenderer.on("chat:chunk", (_e, chunk: string) => fn(chunk)); },
  onDone: (fn: (fullText: string) => void) => { ipcRenderer.once("chat:done", (_e, text: string) => fn(text)); },
  onError: (fn: (err: string) => void) => { ipcRenderer.once("chat:error", (_e, err: string) => fn(err)); },
  clearListeners: () => {
    ipcRenderer.removeAllListeners("chat:chunk");
    ipcRenderer.removeAllListeners("chat:done");
    ipcRenderer.removeAllListeners("chat:error");
  },
  // Settings
  getSettings: (): Promise<Partial<Settings>> => ipcRenderer.invoke("settings:get"),
  setSettings: (settings: Partial<Settings>): Promise<Partial<Settings>> => ipcRenderer.invoke("settings:set", settings),
  testConnection: (provider: Provider, key: string, ollamaUrl?: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("settings:test", provider, key, ollamaUrl),
  // Ollama
  getOllamaModels: (url?: string): Promise<string[]> => ipcRenderer.invoke("ollama:models", url),
  // Open external URL in system browser
  openExternal: (url: string) => { ipcRenderer.send("open:external", url); },
});
