import { create } from 'zustand';
import { apiSendMessage, apiGetConversations, apiGetConversation, apiDeleteConversation } from '../services/api';

const useChatStore = create((set, get) => ({
  messages: [],
  conversations: [],
  activeConversationId: null,
  activeMode: 'general',
  loading: false,
  sending: false,
  error: null,

  setMode: (mode) => set({ activeMode: mode }),

  sendMessage: async (text) => {
    const { activeConversationId, activeMode, messages } = get();
    const userMsg = {
      message_id: 'temp-' + Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    set({ messages: [...messages, userMsg], sending: true, error: null });

    try {
      const data = await apiSendMessage(text, activeConversationId, activeMode);
      const assistantMsg = {
        message_id: 'resp-' + Date.now(),
        role: 'assistant',
        content: data.response,
        language: data.language,
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        activeConversationId: data.conversation_id,
        sending: false,
      }));

      // Refresh conversation list
      get().loadConversations();
    } catch (err) {
      set({ error: err.message, sending: false });
    }
  },

  loadConversations: async () => {
    try {
      const data = await apiGetConversations();
      set({ conversations: data });
    } catch (err) {
      // Silent fail for conversation list
    }
  },

  loadConversation: async (id) => {
    set({ loading: true });
    try {
      const data = await apiGetConversation(id);
      set({
        messages: data.messages || [],
        activeConversationId: id,
        activeMode: data.mode || 'general',
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  newConversation: () => {
    set({
      messages: [],
      activeConversationId: null,
      error: null,
    });
  },

  deleteConversation: async (id) => {
    try {
      await apiDeleteConversation(id);
      const { activeConversationId } = get();
      if (activeConversationId === id) {
        set({ messages: [], activeConversationId: null });
      }
      get().loadConversations();
    } catch (err) {
      set({ error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useChatStore;
