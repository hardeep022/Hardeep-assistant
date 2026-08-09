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
  { id: 'qwen2.5-coder:1.5b', name: 'Qwen 2.5 Coder (1.5B)', provider: 'ollama', description: 'Local · Installed Model', free: true },
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
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface TaskItem {
  id: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  status: TaskStatus;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: number;
  completedAt?: number;
}

export interface ReminderItem {
  id: string;
  title: string;
  dueTimestamp: number;
  recurring?: 'none' | 'daily' | 'weekly';
  active: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  sensitive?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  recoveryKey: string;
  language: 'en' | 'hi' | 'pa';
  createdAt: number;
}

export type ActionRisk = 'safe' | 'warning' | 'blocked';
export type ActionType = 'open_app' | 'open_website' | 'open_file' | 'open_folder' | 'open_settings';

export interface ActionRequest {
  id?: string;
  type: ActionType;
  target: string;
  label?: string;
}

export interface ActionLogItem {
  id: string;
  timestamp: number;
  type?: ActionType;
  actionType?: string;
  target: string;
  label?: string;
  risk?: ActionRisk;
  riskLevel?: string;
  status: 'success' | 'failed' | 'blocked' | 'cancelled' | 'executed';
  details?: string;
  error?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  cpuModel: string;
  totalMemGB: number;
  freeMemGB: string;
  hostname: string;
  uptimeHours: string;
  appVersion: string;
}

export interface Settings {
  openaiKey: string;
  geminiKey: string;
  anthropicKey: string;
  ollamaUrl: string;
  defaultModel: string;
  systemPrompt?: string;
  theme?: 'dark' | 'light' | 'system';
  language?: 'en' | 'hi' | 'pa';
  wakeWordEnabled?: boolean;
  voiceSpeed?: number;
  autoSpeak?: boolean;
  autoStart?: boolean;
  voiceEnabled?: boolean;
  sttProvider?: 'auto' | 'web' | 'local';
  ttsVoice?: string;
  voiceVolume?: number;
}

export interface ChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model: string;
  provider: Provider;
  ollamaUrl?: string;
  systemPrompt?: string;
}

export interface VoiceCommand {
  action: 'start_ptt' | 'stop_ptt' | 'set_wake_word' | 'speak' | 'stop_speaking' | 'transcribe_pcm' | 'transcribe_audio_blob';
  enabled?: boolean;
  text?: string;
  pcmBase64?: string;
  sampleRate?: number;
  audioBase64?: string;
  mimeType?: string;
  lang?: string;
}

export interface VoiceEvent {
  event: 'ready' | 'listening' | 'listening_stopped' | 'wake_word' | 'wake_word_status' | 'transcript' | 'speaking' | 'speaking_stopped' | 'error' | 'transcribing';
  text?: string;
  message?: string;
  mode?: 'ptt' | 'wake';
  enabled?: boolean;
}

export type MemoryType = 'long_term' | 'user_preference' | 'project' | 'task';

export interface MemoryItem {
  id: string;
  type: MemoryType;
  key: string;
  value: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

export type SecurityTier = 'safe' | 'confirmation_required' | 'high_risk';

export interface ToolDefinition {
  name: string;
  description: string;
  securityTier: SecurityTier;
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
}

declare global {
  interface Window {
    nova?: {
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
      classifyAction: (action: { type: string; target: string }) => Promise<{ risk: ActionRisk; reason: string }>;
      executeAction: (action: { type: string; target: string; label?: string }, bypassWarning?: boolean) => Promise<{ ok: boolean; risk?: ActionRisk; reason?: string; requiresConfirmation?: boolean; error?: string; output?: string; success?: boolean }>;
      getActionLogs: () => Promise<ActionLogItem[]>;
      clearActionLogs: () => Promise<boolean>;
      getSystemInfo: () => Promise<SystemInfo>;
      // Memory IPC
      getMemories: (type?: MemoryType) => Promise<MemoryItem[]>;
      saveMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<MemoryItem>;
      deleteMemory: (id: string) => Promise<boolean>;
      clearMemories: (type?: MemoryType) => Promise<boolean>;
      // Tool IPC
      executeTool: (request: ToolCallRequest, bypassConfirmation?: boolean) => Promise<{ success: boolean; result?: unknown; error?: string; requiresConfirmation?: boolean; securityTier?: SecurityTier }>;
      // Terminal IPC
      executeTerminalCommand: (command: string, cwd?: string, timeoutMs?: number) => Promise<{ success: boolean; exitCode: number; stdout: string; stderr: string; durationMs: number }>;
      // Git IPC
      gitStatus: (cwd?: string) => Promise<{ success: boolean; isGit: boolean; branch?: string; files?: Array<{ status: string; path: string }>; error?: string }>;
      gitDiff: (cwd?: string) => Promise<{ success: boolean; diff: string }>;
      gitCommit: (message: string, cwd?: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      // Hardware Metrics IPC
      getHardwareMetrics: () => Promise<HardwareMetrics>;
      // Ollama Model Operations
      pullOllamaModel: (modelName: string, url?: string) => Promise<{ success: boolean; error?: string }>;
      deleteOllamaModel: (modelName: string, url?: string) => Promise<{ success: boolean; error?: string }>;
      // Workspace & File Tree IPC
      selectWorkspaceFolder: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>;
      getWorkspaceTree: (rootPath: string) => Promise<{ success: boolean; tree?: WorkspaceTreeItem; metadata?: ProjectMetadata; error?: string }>;
      readFileContent: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFileContent: (filePath: string, content: string) => Promise<{ success: boolean; diff?: FileDiff; error?: string }>;
      deleteWorkspaceFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      // Codebase Hybrid Search IPC
      searchCodebase: (query: string, rootPath: string) => Promise<{ success: boolean; results?: CodeSearchHit[]; error?: string }>;
      // Screen Sharing & Screen Capture IPC
      getScreenSources: () => Promise<{ success: boolean; sources: ScreenSource[]; error?: string }>;
      captureScreenFrame: (payload?: { sourceId?: string; width?: number; height?: number }) => Promise<{ success: boolean; dataUrl?: string; base64Data?: string; mimeType?: string; sourceId?: string; sourceName?: string; timestamp?: number; error?: string }>;
    };
  }
}

export interface ScreenSource {
  id: string;
  name: string;
  displayId?: string;
  thumbnail: string;
  appIcon?: string;
}

export interface CapturedFrame {
  dataUrl: string;
  base64Data: string;
  mimeType: string;
  sourceId?: string;
  sourceName?: string;
  timestamp: number;
}

export interface TaskGuideStep {
  id: string;
  title: string;
  description: string;
  actionRequired?: string;
  targetRegionHint?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  feedbackNote?: string;
}

export interface TaskGuideSession {
  id: string;
  taskTitle: string;
  activeSourceId?: string;
  activeSourceName?: string;
  steps: TaskGuideStep[];
  currentStepIndex: number;
  isScanning: boolean;
  autoScanInterval: number;
  lastScanTimestamp?: number;
}


export type AgentPermissionLevel = 'ask_every_time' | 'trusted' | 'full_agent';

export interface WorkspaceTreeItem {
  name: string;
  path: string;
  relativePath: string;
  isDir: boolean;
  children?: WorkspaceTreeItem[];
  size?: number;
}

export interface ProjectMetadata {
  name: string;
  rootPath: string;
  languages: string[];
  frameworks: string[];
  dependencies: Record<string, string>;
  packageManager: string;
  testFramework?: string;
  hasGit: boolean;
  instructions?: string;
}

export interface CodeSearchHit {
  filePath: string;
  relativePath: string;
  line: number;
  snippet: string;
  score: number;
}

export interface AgentPlanStep {
  id: string;
  title: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  tool?: string;
  targetFile?: string;
  command?: string;
  output?: string;
  error?: string;
}

export interface AgentPlan {
  id: string;
  taskPrompt: string;
  steps: AgentPlanStep[];
  currentStepIndex: number;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'paused';
}

export interface DiffHunkLine {
  type: 'add' | 'delete' | 'normal';
  lineNoOld?: number;
  lineNoNew?: number;
  text: string;
}

export interface FileDiff {
  filePath: string;
  relativePath: string;
  oldContent: string;
  newContent: string;
  diffHunks: DiffHunkLine[];
}

export interface HardwareMetrics {
  platform: string;
  arch: string;
  cpuCount: number;
  cpuModel: string;
  cpuUsagePercent?: number;
  totalMemGB: string;
  freeMemGB: string;
  usedMemGB: string;
  memUsagePercent: number;
  gpuName?: string;
  vramTotalGB?: string;
  vramUsedGB?: string;
  vramUsagePercent?: number;
  tokensPerSec?: number;
  processRssMB: number;
  processHeapMB: number;
  uptimeHours: string;
  ollamaConnected?: boolean;
}

