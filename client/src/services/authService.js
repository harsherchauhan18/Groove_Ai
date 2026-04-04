import api from './api.js';

export const authService = {
  /**
   * Register with email + password.
   */
  register: async ({ name, email, password }) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
    return data;
  },

  /**
   * Login with email + password.
   */
  login: async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
    return data;
  },

  /**
   * Logout — clears tokens.
   */
  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
  },

  /**
   * Fetch the current authenticated user.
   */
  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data.user;
  },

  /**
   * Initiate Google OAuth redirect.
   */
  loginWithGoogle: () => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    window.location.href = `${base}/auth/google`;
  },
};
