import axios from 'axios';

const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const aiService = {
  createThread: async (repoId) => {
    const { data } = await api.post('/api/chat/thread', { repo_id: repoId });
    return data;
  },

  getThreads: async (repoId) => {
    const { data } = await api.get(`/api/chat/threads?repo_id=${repoId}`);
    return data;
  },

  getMessages: async (threadId) => {
    const { data } = await api.get(`/api/chat/thread/${threadId}`);
    return data;
  },

  sendMessageStream: async (repoId, threadId, message, onChunk, onDone, onError) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ repo_id: repoId, thread_id: threadId, message })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
      if (onDone) onDone();

    } catch (error) {
      console.error("Streaming error:", error);
      if (onError) onError(error);
    }
  },

  navigate: async (repoId, query) => {
    const { data } = await api.post('/api/ai/navigate', { repo_id: repoId, query });
    return data;
  },

  getFileContent: async (repoId, filePath) => {
    const { data } = await api.post('/api/ai/file', { repo_id: repoId, file_path: filePath });
    return data;
  }
};

export default aiService;
