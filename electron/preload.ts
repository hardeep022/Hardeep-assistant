import { contextBridge, ipcRenderer } from "electron";

type Provider = 'openai' | 'gemini' | 'anthropic' | 'ollama';
interface Settings { openaiKey: string; geminiKey: string; anthropicKey: string; ollamaUrl: string; defaultModel: string; }
interface ChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model: string;
  provider: Provider;
  ollamaUrl?: string;
}

interface VoiceCommand {
  action: 'start_ptt' | 'stop_ptt' | 'set_wake_word' | 'speak' | 'stop_speaking';
  enabled?: boolean;
  text?: string;
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
  // Local voice runtime
  voiceCommand: (command: VoiceCommand) => { ipcRenderer.send("voice:command", command); },
  onVoiceEvent: (fn: (event: Record<string, unknown>) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: Record<string, unknown>) => fn(payload);
    ipcRenderer.on("voice:event", listener);
    return () => ipcRenderer.removeListener("voice:event", listener);
  },
  // System Actions & Safety Framework
  classifyAction: (action: { type: string; target: string }): Promise<{ risk: 'safe' | 'warning' | 'blocked'; reason: string }> =>
    ipcRenderer.invoke("action:classify", action),
  executeAction: (action: { type: string; target: string; label?: string }, bypassWarning?: boolean): Promise<{ ok: boolean; risk?: string; reason?: string; requiresConfirmation?: boolean; error?: string }> =>
    ipcRenderer.invoke("action:execute", action, bypassWarning),
  getActionLogs: (): Promise<Array<{ id: string; timestamp: number; type: string; target: string; label?: string; risk: string; status: string; error?: string }>> =>
    ipcRenderer.invoke("action:logs"),
  clearActionLogs: (): Promise<boolean> => ipcRenderer.invoke("action:clear-logs"),
  // System Info
  getSystemInfo: (): Promise<{ platform: string; arch: string; cpus: number; cpuModel: string; totalMemGB: number; freeMemGB: string; hostname: string; uptimeHours: string; appVersion: string }> =>
    ipcRenderer.invoke("system:info"),
  // Memory IPC
  getMemories: (type?: string): Promise<any[]> => ipcRenderer.invoke("memory:get", type),
  saveMemory: (memory: any): Promise<any> => ipcRenderer.invoke("memory:save", memory),
  deleteMemory: (id: string): Promise<boolean> => ipcRenderer.invoke("memory:delete", id),
  clearMemories: (type?: string): Promise<boolean> => ipcRenderer.invoke("memory:clear", type),
  // Tool Execution IPC
  executeTool: (request: any, bypassConfirmation?: boolean): Promise<any> => ipcRenderer.invoke("tool:execute", request, bypassConfirmation),
  // Terminal Execution API
  executeTerminalCommand: (command: string, cwd?: string, timeoutMs?: number): Promise<{ success: boolean; exitCode: number; stdout: string; stderr: string; durationMs: number }> =>
    ipcRenderer.invoke("terminal:execute", { command, cwd, timeoutMs }),
  // Git Integration API
  gitStatus: (cwd?: string): Promise<{ success: boolean; isGit: boolean; branch?: string; files?: Array<{ status: string; path: string }>; error?: string }> =>
    ipcRenderer.invoke("git:status", cwd),
  gitDiff: (cwd?: string): Promise<{ success: boolean; diff: string }> =>
    ipcRenderer.invoke("git:diff", cwd),
  gitCommit: (message: string, cwd?: string): Promise<{ success: boolean; output?: string; error?: string }> =>
    ipcRenderer.invoke("git:commit", message, cwd),
  // Hardware Monitoring API
  getHardwareMetrics: (): Promise<{ platform: string; arch: string; cpuCount: number; cpuModel: string; totalMemGB: string; freeMemGB: string; usedMemGB: string; memUsagePercent: number; processRssMB: number; processHeapMB: number; uptimeHours: string }> =>
    ipcRenderer.invoke("system:hardware"),
  // Ollama Model Operations
  pullOllamaModel: (modelName: string, url?: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("ollama:pull", modelName, url),
  deleteOllamaModel: (modelName: string, url?: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("ollama:delete", modelName, url),
  // Workspace & File Tree IPC
  selectWorkspaceFolder: (): Promise<{ success: boolean; path?: string; canceled?: boolean }> =>
    ipcRenderer.invoke("workspace:select"),
  getWorkspaceTree: (rootPath: string): Promise<any> =>
    ipcRenderer.invoke("workspace:tree", rootPath),
  readFileContent: (filePath: string): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke("workspace:read-file", filePath),
  writeFileContent: (filePath: string, content: string): Promise<any> =>
    ipcRenderer.invoke("workspace:write-file", filePath, content),
  deleteWorkspaceFile: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("workspace:delete-file", filePath),
  // Codebase Hybrid Search IPC
  searchCodebase: (query: string, rootPath: string): Promise<any> =>
    ipcRenderer.invoke("workspace:search-code", query, rootPath),
  // Web Search IPC
  webSearch: (query: string): Promise<any> =>
    ipcRenderer.invoke("web:search", query),
  // Document Intelligence IPC
  parseDocument: (filePath: string): Promise<any> =>
    ipcRenderer.invoke("document:parse", filePath),
  // Local Model Benchmark IPC
  benchmarkModel: (modelId: string, url?: string): Promise<any> =>
    ipcRenderer.invoke("model:benchmark", modelId, url),
  // Audio File Intelligence IPC
  parseAudio: (filePath: string): Promise<any> =>
    ipcRenderer.invoke("audio:parse", filePath),
  // Screen Sharing & Screen Capture IPC
  getScreenSources: (): Promise<{ success: boolean; sources: Array<{ id: string; name: string; displayId?: string; thumbnail: string; appIcon?: string }>; error?: string }> =>
    ipcRenderer.invoke("screen:get-sources"),
  captureScreenFrame: (payload?: { sourceId?: string; width?: number; height?: number }): Promise<{ success: boolean; dataUrl?: string; base64Data?: string; mimeType?: string; sourceId?: string; sourceName?: string; timestamp?: number; error?: string }> =>
    ipcRenderer.invoke("screen:capture-frame", payload),
});




