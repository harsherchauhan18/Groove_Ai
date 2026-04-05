import { create } from 'zustand';
import axios from 'axios';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

const useInsightsStore = create((set, get) => ({
  insights: {
    totalFiles: 0,
    totalLoc: 0,
    authors: [],
    timeline: [],
    languages: [],
    hotspots: [],
    treeData: null,
    loading: false,
    error: null,
  },
  
  selectedFile: null,
  fileInsight: {
    loading: false,
    summary: '',
    preview: '',
    loc: 0,
    complexity: 0,
    lastModified: '',
    error: null
  },

  fetchRepoInsights: async (repoId) => {
    set(state => ({ insights: { ...state.insights, loading: true, error: null } }));
    try {
      const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewRes, treeRes] = await Promise.all([
        axios.get(`${FASTAPI_URL}/api/insights/overview?repo_id=${repoId}`, { headers }),
        axios.get(`${FASTAPI_URL}/api/insights/tree?repo_id=${repoId}`, { headers })
      ]);

      set({
        insights: {
          ...overviewRes.data,
          treeData: treeRes.data,
          loading: false,
          error: null
        }
      });
    } catch (err) {
      console.error("Fetch insights error:", err);
      set(state => ({ insights: { ...state.insights, loading: false, error: err.message } }));
    }
  },

  selectFile: async (repoId, filePath) => {
    if (!filePath) {
        set({ selectedFile: null, fileInsight: { ...get().fileInsight, loading: false } });
        return;
    }

    set({ 
        selectedFile: filePath, 
        fileInsight: { ...get().fileInsight, loading: true, error: null } 
    });

    try {
      const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.get(
        `${FASTAPI_URL}/api/insights/file?repo_id=${repoId}&file_path=${filePath}`,
        { headers }
      );

      set({
        fileInsight: {
          loading: false,
          summary: res.data.summary,
          preview: res.data.preview,
          loc: res.data.loc,
          complexity: res.data.complexity,
          lastModified: res.data.last_modified,
          error: null
        }
      });
    } catch (err) {
      console.error("File insight fetch error:", err);
      set({ fileInsight: { ...get().fileInsight, loading: false, error: err.message } });
    }
  }
}));

export default useInsightsStore;
