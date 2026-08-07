import { create } from 'zustand';
import { apiLogin, apiRegister } from '../services/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('nova_user') || 'null'),
  token: localStorage.getItem('nova_token') || null,
  isAuthenticated: !!localStorage.getItem('nova_token'),
  loading: false,
  error: null,
  recoveryKey: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem('nova_token', data.token);
      localStorage.setItem('nova_user', JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        display_name: data.display_name,
      }));
      set({
        user: { user_id: data.user_id, username: data.username, display_name: data.display_name },
        token: data.token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async (username, displayName, password, language) => {
    set({ loading: true, error: null });
    try {
      const data = await apiRegister(username, displayName, password, language);
      localStorage.setItem('nova_token', data.token);
      localStorage.setItem('nova_user', JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        display_name: data.display_name,
      }));
      set({
        user: { user_id: data.user_id, username: data.username, display_name: data.display_name },
        token: data.token,
        isAuthenticated: true,
        loading: false,
        recoveryKey: data.recovery_key,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('nova_token');
    localStorage.removeItem('nova_user');
    set({ user: null, token: null, isAuthenticated: false, recoveryKey: null });
  },

  clearError: () => set({ error: null }),
  clearRecoveryKey: () => set({ recoveryKey: null }),
}));

export default useAuthStore;
