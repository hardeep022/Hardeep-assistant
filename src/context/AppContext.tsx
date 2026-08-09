import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Conversation, Message, Settings, AssistantMode, TaskItem, NoteItem, ReminderItem, UserProfile, TaskStatus, ActionLogItem } from '../types';

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  conversations: Conversation[];
  activeConversationId: string | null;
  settings: Settings;
  isSettingsOpen: boolean;
  isProductivityOpen: boolean;
  isSecurityToolsOpen: boolean;
  isAuthOpen: boolean;
  isActionLogsOpen: boolean;
  isScreenGuideOpen: boolean;
  pendingAction: any | null;
  actionLogs: ActionLogItem[];
  currentUser: UserProfile | null;
  tasks: TaskItem[];
  reminders: ReminderItem[];
  notes: NoteItem[];
}

const DEFAULT_SETTINGS: Settings = {
  openaiKey: '',
  geminiKey: '',
  anthropicKey: '',
  ollamaUrl: 'http://localhost:11434',
  defaultModel: 'llama3.2',
  language: 'en',
  theme: 'dark',
  autoSpeak: false,
};

const initialState: AppState = {
  conversations: [],
  activeConversationId: null,
  settings: DEFAULT_SETTINGS,
  isSettingsOpen: false,
  isProductivityOpen: false,
  isSecurityToolsOpen: false,
  isAuthOpen: false,
  isActionLogsOpen: false,
  isScreenGuideOpen: false,
  pendingAction: null,
  actionLogs: [],
  currentUser: null,
  tasks: [],
  reminders: [],
  notes: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'NEW_CHAT'; id?: string; model?: string; mode?: AssistantMode }
  | { type: 'SELECT_CHAT'; id: string }
  | { type: 'DELETE_CHAT'; id: string }
  | { type: 'CLEAR_ALL_CHATS' }
  | { type: 'ADD_MESSAGE'; conversationId: string; message: Message }
  | { type: 'DELETE_MESSAGE'; conversationId: string; messageId: string }
  | { type: 'EDIT_MESSAGE'; conversationId: string; messageId: string; newContent: string }
  | { type: 'TRUNCATE_TO_MESSAGE'; conversationId: string; messageId: string }
  | { type: 'SET_TITLE'; conversationId: string; title: string }
  | { type: 'SET_MODEL'; conversationId: string; model: string }
  | { type: 'SET_MODE'; conversationId: string; mode: AssistantMode }
  | { type: 'TOGGLE_PIN'; conversationId: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'SET_SETTINGS_OPEN'; open: boolean }
  | { type: 'SET_PRODUCTIVITY_OPEN'; open: boolean }
  | { type: 'SET_SECURITY_TOOLS_OPEN'; open: boolean }
  | { type: 'SET_AUTH_OPEN'; open: boolean }
  | { type: 'SET_ACTION_LOGS_OPEN'; open: boolean }
  | { type: 'SET_SCREEN_GUIDE_OPEN'; open: boolean }
  | { type: 'SET_PENDING_ACTION'; action: any }
  | { type: 'ADD_ACTION_LOG'; log: ActionLogItem }
  | { type: 'SET_CURRENT_USER'; user: UserProfile | null }
  | { type: 'ADD_TASK'; task: TaskItem }
  | { type: 'UPDATE_TASK'; task: TaskItem }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'TOGGLE_TASK'; taskId: string }
  | { type: 'SET_TASK_STATUS'; taskId: string; status: TaskStatus }
  | { type: 'ADD_REMINDER'; reminder: ReminderItem }
  | { type: 'UPDATE_REMINDER'; reminder: ReminderItem }
  | { type: 'DELETE_REMINDER'; reminderId: string }
  | { type: 'TOGGLE_REMINDER'; reminderId: string }
  | { type: 'ADD_NOTE'; note: NoteItem }
  | { type: 'UPDATE_NOTE'; note: NoteItem }
  | { type: 'DELETE_NOTE'; noteId: string }
  | { type: 'PURGE_ALL_DATA' }
  | { type: 'HYDRATE'; state: AppState };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN_GUIDE_OPEN':
      return { ...state, isScreenGuideOpen: action.open };
    case 'SET_PENDING_ACTION':

      return { ...state, pendingAction: action.action };
    case 'ADD_ACTION_LOG':
      return { ...state, actionLogs: [action.log, ...(state.actionLogs || [])] };
    case 'HYDRATE':
      return {
        ...action.state,
        tasks: action.state.tasks || [],
        reminders: action.state.reminders || [],
        notes: action.state.notes || [],
        isProductivityOpen: false,
        isSecurityToolsOpen: false,
        isAuthOpen: false,
        isActionLogsOpen: false,
      };

    case 'SET_AUTH_OPEN':
      return { ...state, isAuthOpen: action.open };

    case 'SET_ACTION_LOGS_OPEN':
      return { ...state, isActionLogsOpen: action.open };

    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.user };

    case 'SET_PRODUCTIVITY_OPEN':
      return { ...state, isProductivityOpen: action.open };

    case 'SET_SECURITY_TOOLS_OPEN':
      return { ...state, isSecurityToolsOpen: action.open };

    case 'ADD_TASK':
      return { ...state, tasks: [action.task, ...state.tasks] };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => (t.id === action.task.id ? action.task : t)),
      };

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.taskId),
      };

    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.taskId) return t;
          const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
          return {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? Date.now() : undefined,
          };
        }),
      };

    case 'SET_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.taskId) return t;
          return {
            ...t,
            status: action.status,
            completedAt: action.status === 'completed' ? Date.now() : undefined,
          };
        }),
      };

    case 'ADD_REMINDER':
      return { ...state, reminders: [action.reminder, ...state.reminders] };

    case 'UPDATE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.reminder.id ? action.reminder : r)),
      };

    case 'DELETE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.filter(r => r.id !== action.reminderId),
      };

    case 'TOGGLE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map(r => (r.id === action.reminderId ? { ...r, active: !r.active } : r)),
      };

    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes] };

    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(n => (n.id === action.note.id ? action.note : n)),
      };

    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter(n => n.id !== action.noteId),
      };

    case 'PURGE_ALL_DATA':
      return {
        ...initialState,
        settings: state.settings,
      };

    case 'NEW_CHAT': {
      const id = action.id ?? crypto.randomUUID();
      const now = Date.now();
      const newConv: Conversation = {
        id,
        title: 'New Chat',
        messages: [],
        createdAt: now,
        updatedAt: now,
        model: action.model ?? state.settings.defaultModel,
        mode: action.mode ?? 'general',
      };
      return {
        ...state,
        conversations: [newConv, ...state.conversations],
        activeConversationId: id,
      };
    }

    case 'SELECT_CHAT':
      return { ...state, activeConversationId: action.id };

    case 'DELETE_CHAT': {
      const filtered = state.conversations.filter(c => c.id !== action.id);
      const activeId =
        state.activeConversationId === action.id
          ? (filtered[0]?.id ?? null)
          : state.activeConversationId;
      return { ...state, conversations: filtered, activeConversationId: activeId };
    }

    case 'CLEAR_ALL_CHATS':
      return { ...state, conversations: [], activeConversationId: null };

    case 'ADD_MESSAGE': {
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.conversationId
            ? { ...c, messages: [...c.messages, action.message], updatedAt: Date.now() }
            : c
        ),
      };
    }

    case 'DELETE_MESSAGE': {
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.conversationId
            ? { ...c, messages: c.messages.filter(m => m.id !== action.messageId), updatedAt: Date.now() }
            : c
        ),
      };
    }

    case 'EDIT_MESSAGE': {
      return {
        ...state,
        conversations: state.conversations.map(c => {
          if (c.id !== action.conversationId) return c;
          const idx = c.messages.findIndex(m => m.id === action.messageId);
          if (idx === -1) return c;
          const truncated = c.messages.slice(0, idx + 1);
          truncated[idx] = { ...truncated[idx], content: action.newContent };
          return { ...c, messages: truncated, updatedAt: Date.now() };
        }),
      };
    }

    case 'TRUNCATE_TO_MESSAGE': {
      return {
        ...state,
        conversations: state.conversations.map(c => {
          if (c.id !== action.conversationId) return c;
          const idx = c.messages.findIndex(m => m.id === action.messageId);
          if (idx === -1) return c;
          return { ...c, messages: c.messages.slice(0, idx + 1), updatedAt: Date.now() };
        }),
      };
    }

    case 'SET_TITLE': {
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.conversationId ? { ...c, title: action.title } : c
        ),
      };
    }

    case 'SET_MODEL': {
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.conversationId ? { ...c, model: action.model } : c
        ),
      };
    }

    case 'SET_MODE': {
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.conversationId ? { ...c, mode: action.mode } : c
        ),
      };
    }

    case 'TOGGLE_PIN': {
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.conversationId ? { ...c, pinned: !c.pinned } : c
        ),
      };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'SET_SETTINGS_OPEN':
      return { ...state, isSettingsOpen: action.open };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  activeConversation: Conversation | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nova-state');
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        // Merge with DEFAULT_SETTINGS to handle new settings keys
        parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        dispatch({ type: 'HYDRATE', state: parsed });
      }
    } catch {
      // Ignore invalid persisted state and start with a clean session.
    }

    // Also load encrypted settings from Electron
    if (window.nova?.getSettings) {
      window.nova.getSettings().then(settings => {
        dispatch({ type: 'UPDATE_SETTINGS', settings });
      }).catch(() => {
        // Electron APIs are unavailable in browser-only development mode.
      });
    }
  }, []);

  // Persist to localStorage with debouncing (300ms) to avoid blocking main thread during high-frequency streaming
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const toSave: AppState = {
          ...state,
          settings: {
            ...state.settings,
            // Don't persist raw API keys to localStorage (they're stored in Electron's safeStorage)
            openaiKey: '',
            geminiKey: '',
            anthropicKey: '',
          },
        };
        localStorage.setItem('nova-state', JSON.stringify(toSave));
      } catch (e) {
        console.warn('Failed to save state to localStorage:', e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [state]);

  // Apply theme to document
  useEffect(() => {
    const theme = state.settings.theme ?? 'dark';

    const applyTheme = (resolved: 'dark' | 'light') => {
      document.body.classList.add('theme-transition');
      document.documentElement.setAttribute('data-theme', resolved);
      // Remove transition class after animation completes to avoid interfering with other transitions
      const timer = setTimeout(() => document.body.classList.remove('theme-transition'), 250);
      return timer;
    };

    let timer: ReturnType<typeof setTimeout>;

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const resolved = mql.matches ? 'dark' : 'light';
      timer = applyTheme(resolved);
      const handler = (e: MediaQueryListEvent) => { applyTheme(e.matches ? 'dark' : 'light'); };
      mql.addEventListener('change', handler);
      return () => { clearTimeout(timer); mql.removeEventListener('change', handler); };
    } else {
      timer = applyTheme(theme);
      return () => clearTimeout(timer);
    }
  }, [state.settings.theme]);

  const activeConversation =
    state.conversations.find(c => c.id === state.activeConversationId) ?? null;

  return (
    <AppContext.Provider value={{ state, dispatch, activeConversation }}>
      {children}
    </AppContext.Provider>
  );
}

// This hook intentionally shares the same module as its provider to keep the context API cohesive.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
