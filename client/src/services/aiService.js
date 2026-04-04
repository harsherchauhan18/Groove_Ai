import axios from 'axios';

const API_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

const aiService = {
  queryRepository: async (repoId, query) => {
    try {
      const token = localStorage.getItem('accessToken');
      console.log("TOKEN:", token);
      const response = await axios.post(`${API_URL}/api/ai/query`, {
        repo_id: repoId,
        query: query
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error querying repository:', error);
      throw error;
    }
  }
};

export default aiService;

