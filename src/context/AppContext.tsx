import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Conversation, Message, Settings } from '../types';

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  conversations: Conversation[];
  activeConversationId: string | null;
  settings: Settings;
  isSettingsOpen: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  openaiKey: '',
  geminiKey: '',
  anthropicKey: '',
  ollamaUrl: 'http://localhost:11434',
  defaultModel: 'qwen2.5-coder:1.5b',
};

const initialState: AppState = {
  conversations: [],
  activeConversationId: null,
  settings: DEFAULT_SETTINGS,
  isSettingsOpen: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'NEW_CHAT'; id?: string; model?: string }
  | { type: 'SELECT_CHAT'; id: string }
  | { type: 'DELETE_CHAT'; id: string }
  | { type: 'ADD_MESSAGE'; conversationId: string; message: Message }
  | { type: 'DELETE_MESSAGE'; conversationId: string; messageId: string }
  | { type: 'EDIT_MESSAGE'; conversationId: string; messageId: string; newContent: string }
  | { type: 'TRUNCATE_TO_MESSAGE'; conversationId: string; messageId: string }
  | { type: 'SET_TITLE'; conversationId: string; title: string }
  | { type: 'SET_MODEL'; conversationId: string; model: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'SET_SETTINGS_OPEN'; open: boolean }
  | { type: 'HYDRATE'; state: AppState };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

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

  // Persist to localStorage whenever state changes (excluding settings keys)
  useEffect(() => {
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
  }, [state]);

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
