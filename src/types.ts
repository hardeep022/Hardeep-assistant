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
  mode?: AssistantMode;
  systemPrompt?: string;
  pinned?: boolean;
}

export type AssistantMode = 'general' | 'coding' | 'learning' | 'research' | 'productivity' | 'cybersecurity' | 'writing';

export interface ModeConfig {
  id: AssistantMode;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
}

export const ASSISTANT_MODES: ModeConfig[] = [
  {
    id: 'general',
    name: 'General',
    icon: '✦',
    description: 'All-around helpful AI assistant for any query or conversation.',
    systemPrompt: 'You are Nova (Hardeep Assistant), a friendly, helpful, and highly capable AI desktop assistant. You support English, Hindi, and Punjabi fluently.',
  },
  {
    id: 'coding',
    name: 'Coding',
    icon: '💻',
    description: 'Expert coding assistant for debugging, refactoring, and code explanation.',
    systemPrompt: 'You are Nova in Coding Mode. You are an expert software engineer and computer scientist. Provide clean, well-commented, idiomatic code with clear explanations, error diagnoses, and best practices. Preserve code clarity and provide syntax-highlighted examples.',
  },
  {
    id: 'learning',
    name: 'Learning',
    icon: '📚',
    description: 'Break complex concepts into simple steps, analogies, and quizzes.',
    systemPrompt: 'You are Nova in Learning Mode. You are an encouraging tutor and educator. Explain complex concepts step-by-step with intuitive analogies, structured summaries, and interactive flashcard/quiz questions tailored to the learner.',
  },
  {
    id: 'research',
    name: 'Research',
    icon: '🔬',
    description: 'In-depth analysis, structured comparison tables, and summarization.',
    systemPrompt: 'You are Nova in Research Mode. You provide rigorous, well-structured, unbiased research analysis with comparison tables, pros/cons, and concise syntheses of complex literature.',
  },
  {
    id: 'productivity',
    name: 'Productivity',
    icon: '⚡',
    description: 'Task planning, time management, and daily prioritization.',
    systemPrompt: 'You are Nova in Productivity Mode. You help users organize tasks, create prioritized actionable checklists, schedule reminders, and structure notes effectively.',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    icon: '🛡️',
    description: 'Defensive security guidance, best practices, and phishing detection.',
    systemPrompt: 'You are Nova in Cybersecurity Mode. You are a defensive cybersecurity specialist. You educate users on security best practices, identify phishing threats, explain hashing and encryption, and advise on secure configuration.',
  },
  {
    id: 'writing',
    name: 'Writing',
    icon: '✍️',
    description: 'Draft emails, refine essays, adjust tone, and correct grammar.',
    systemPrompt: 'You are Nova in Writing Mode. You help users craft compelling prose, polish professional emails, adjust tone (formal, persuasive, friendly), and fix grammar while preserving authentic voice.',
  },
];

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'completed';

export interface TaskItem {
  id: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
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
