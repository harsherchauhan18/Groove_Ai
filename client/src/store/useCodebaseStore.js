import { create } from 'zustand';

const useCodebaseStore = create((set, get) => ({
  activeRepoId: null,
  repoList: [],
  repoStatusMap: {},
  activeFilePath: null,
  activeNodeId: null,
  repoTree: [],
  repoGraph: { nodes: [], edges: [] },

  setActiveRepoId: (id) => set({ 
    activeRepoId: id, 
    activeFilePath: null, 
    activeNodeId: null, 
    repoTree: [], 
    repoGraph: { nodes: [], edges: [] } 
  }),
  
  setActiveFilePath: (path) => set({ activeFilePath: path }),
  setActiveNodeId: (nodeId) => set({ activeNodeId: nodeId }),

  fetchRepositories: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/repos/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch repos');
      const data = await response.json();
      
      const newStatusMap = { ...get().repoStatusMap };
      data.forEach(repo => {
        newStatusMap[repo.id] = repo.status;
      });

      set({ repoList: data, repoStatusMap: newStatusMap });
    } catch (error) {
      console.error('fetchRepositories error:', error);
    }
  },

  pollRepositoryStatus: async (repoId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/repos/${repoId}/status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      
      set(state => ({
        repoStatusMap: { ...state.repoStatusMap, [repoId]: data.status }
      }));
    } catch (error) {
      console.error('pollStatus error:', error);
    }
  },

  fetchTree: async (repoId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/parse/tree/${repoId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      set({ repoTree: data.files || [] });
    } catch (error) {
      console.error('fetchTree error:', error);
    }
  },

  fetchGraph: async (repoId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/graph/dependency/${repoId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      set({ repoGraph: data });
    } catch (error) {
      console.error('fetchGraph error:', error);
    }
  },

  fetchFileContent: async (repoId, filePath) => {
    try {
      const response = await fetch(`http://localhost:8000/api/parse/file?repo_id=${repoId}&file_path=${encodeURIComponent(filePath)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (!response.ok) return '// File not found.';
      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('fetchFileContent error:', error);
      return `// Error loading file: ${error.message}`;
    }
  }
}));

export default useCodebaseStore;
