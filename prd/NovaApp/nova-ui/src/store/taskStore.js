import { create } from 'zustand';
import { apiGetTasks, apiCreateTask, apiCompleteTask, apiDeleteTask, apiUpdateTask } from '../services/api';

const useTaskStore = create((set, get) => ({
  tasks: [],
  filter: 'all', // 'all', 'today', 'overdue', 'completed'
  loading: false,
  error: null,

  setFilter: (filter) => {
    set({ filter });
    get().loadTasks();
  },

  loadTasks: async () => {
    set({ loading: true });
    const { filter } = get();
    try {
      const filters = {};
      if (filter === 'completed') filters.status = 'completed';
      else if (filter === 'today') filters.due = 'today';
      else if (filter === 'overdue') filters.due = 'overdue';
      const data = await apiGetTasks(filters);
      set({ tasks: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createTask: async (task) => {
    try {
      await apiCreateTask(task);
      get().loadTasks();
    } catch (err) {
      set({ error: err.message });
    }
  },

  completeTask: async (taskId) => {
    try {
      await apiCompleteTask(taskId);
      get().loadTasks();
    } catch (err) {
      set({ error: err.message });
    }
  },

  updateTask: async (taskId, updates) => {
    try {
      await apiUpdateTask(taskId, updates);
      get().loadTasks();
    } catch (err) {
      set({ error: err.message });
    }
  },

  deleteTask: async (taskId) => {
    try {
      await apiDeleteTask(taskId);
      get().loadTasks();
    } catch (err) {
      set({ error: err.message });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useTaskStore;
