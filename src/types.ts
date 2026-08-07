export type Provider = 'openai' | 'gemini' | 'anthropic' | 'ollama';

export interface AIModel {
  id: string;
  name: string;
  provider: Provider;
  description: string;
  free?: boolean;
}

export const MODELS: AIModel[] = [
  // Ollama — local, no API key
  { id: 'llama3.2', name: 'Llama 3.2', provider: 'ollama', description: 'Local · General', free: true },
  { id: 'codex', name: 'Codex / CodeLlama', provider: 'ollama', description: 'Local · Code Assistant', free: true },
  { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', provider: 'ollama', description: 'Local · Coding AI', free: true },
  { id: 'codellama', name: 'CodeLlama', provider: 'ollama', description: 'Local · Code Model', free: true },
  { id: 'mistral', name: 'Mistral 7B', provider: 'ollama', description: 'Local · Fast', free: true },
  { id: 'gemma3', name: 'Gemma 3', provider: 'ollama', description: 'Local · Google', free: true },
  // Google Gemini
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', description: "Google's fastest", free: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', description: 'Long context', free: true },
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Most capable' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast & efficient' },
  // Anthropic
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', description: 'Complex tasks' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', description: 'Lightweight' },
];

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  systemPrompt?: string;
}

export interface Settings {
  openaiKey: string;
  geminiKey: string;
  anthropicKey: string;
  ollamaUrl: string;
  defaultModel: string;
  systemPrompt?: string;
  theme?: 'dark' | 'light' | 'system';
}

export interface ChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model: string;
  provider: Provider;
  ollamaUrl?: string;
  systemPrompt?: string;
}

export interface VoiceCommand {
  action: 'start_ptt' | 'stop_ptt' | 'set_wake_word' | 'speak' | 'stop_speaking';
  enabled?: boolean;
  text?: string;
}

export interface VoiceEvent {
  event: 'ready' | 'listening' | 'listening_stopped' | 'wake_word' | 'wake_word_status' | 'transcript' | 'speaking' | 'speaking_stopped' | 'error';
  text?: string;
  message?: string;
  mode?: 'ptt' | 'wake';
  enabled?: boolean;
}

declare global {
  interface Window {
    nova: {
      sendMessage: (payload: ChatPayload) => void;
      onChunk: (fn: (chunk: string) => void) => void;
      onDone: (fn: (fullText: string) => void) => void;
      onError: (fn: (err: string) => void) => void;
      clearListeners: () => void;
      getSettings: () => Promise<Partial<Settings>>;
      setSettings: (settings: Partial<Settings>) => Promise<Partial<Settings>>;
      testConnection: (provider: Provider, key: string, ollamaUrl?: string) => Promise<{ ok: boolean; error?: string }>;
      getOllamaModels: (url?: string) => Promise<string[]>;
      openExternal: (url: string) => void;
      voiceCommand: (command: VoiceCommand) => void;
      onVoiceEvent: (fn: (event: VoiceEvent) => void) => () => void;
    };
  }
}
