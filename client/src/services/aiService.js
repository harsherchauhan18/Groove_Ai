import api from './api.js';

const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

const aiService = {
  queryRepository: async (repoId, query) => {
    try {
      const response = await api.post(
        'http://localhost:8000/api/ai/query',
        {
          repo_id: repoId,
          query: query
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error querying repository:', error);
      if (error.response?.data) {
        console.error("Detailed server error:", error.response.data.detail);
      }
      throw error;
    }
  }
};

export default aiService;

