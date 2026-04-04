import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService.js';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Actions ──────────────────────────────────────────────
      register: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authService.register(credentials);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed.';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authService.login(credentials);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed.';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      },

      fetchMe: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'groove-ai-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
