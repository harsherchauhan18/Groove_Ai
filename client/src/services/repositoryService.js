import axios from 'axios';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: FASTAPI_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const repositoryService = {
  ingest: async (url) => {
    const { data } = await api.post('/api/ingest/clone', { url });
    return data;
  },
  
  getRepositories: async () => {
    const { data } = await api.get('/api/ingest/');
    return data;
  }
};
