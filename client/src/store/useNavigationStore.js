import { create } from 'zustand';
import aiService from '../services/aiService';

const useNavigationStore = create((set, get) => ({
  searchQuery: '',
  isSearching: false,
  navResult: null, // { file_path, start_line, end_line, confidence }
  alternatives: [],
  error: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  handleNavigate: async (repoId, query) => {
    if (!query) return;
    set({ isSearching: true, error: null });
    try {
      const result = await aiService.navigate(repoId, query);
      set({ 
        navResult: {
           file_path: result.file_path,
           start_line: result.start_line,
           end_line: result.end_line,
           confidence: result.confidence
        },
        alternatives: result.alternatives || [],
        isSearching: false 
      });
      return result;
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Navigation failed', isSearching: false });
      return null;
    }
  },

  clearNavigation: () => set({ navResult: null, alternatives: [], error: null })
}));

export default useNavigationStore;
