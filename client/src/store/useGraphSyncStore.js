import { create } from 'zustand';

/**
 * Zustand store for:
 *  1. Bi-directional graph ↔ Monaco editor synchronization
 *  2. VS Code-style folder tree state (treeData, expandedNodes, activeFilePath)
 */
const useGraphSyncStore = create((set, get) => ({
  // ── Graph sync ─────────────────────────────────────────────────────────────
  activeNodeId: null,
  activeFilePath: null,
  activeLine: 1,
  functionMappings: [], // { id, file_path, name, start_line, end_line }

  setFunctionMappings: (mappings) => {
    const sorted = [...mappings].sort((a, b) => a.start_line - b.start_line);
    set({ functionMappings: sorted });
  },

  setActiveNode: (nodeId, filePath, line) => {
    set({ activeNodeId: nodeId, activeFilePath: filePath, activeLine: line || 1 });
  },

  setActiveLine: (filePath, line) => {
    const { functionMappings, activeNodeId } = get();
    const matched = functionMappings.find(
      (fn) => fn.file_path === filePath && line >= fn.start_line && line <= fn.end_line
    );
    if (matched) {
      if (activeNodeId !== matched.id) {
        set({ activeNodeId: matched.id, activeFilePath: filePath, activeLine: line });
      }
    } else {
      if (activeNodeId !== null) {
        set({ activeNodeId: null, activeLine: line });
      } else {
        set({ activeLine: line });
      }
    }
  },

  // ── Tree state ─────────────────────────────────────────────────────────────
  treeData: null,        // nested tree from GET /api/graph/tree/:repoId
  treeLoading: false,
  treeError: null,
  expandedNodes: {},     // { [nodePath]: true }
  
  setTreeData: (data) => set({ treeData: data, treeLoading: false, treeError: null }),
  setTreeLoading: (v) => set({ treeLoading: v }),
  setTreeError: (e) => set({ treeError: e, treeLoading: false }),

  toggleExpand: (nodePath) =>
    set((state) => ({
      expandedNodes: {
        ...state.expandedNodes,
        [nodePath]: !state.expandedNodes[nodePath],
      },
    })),

  setExpanded: (nodePath, value) =>
    set((state) => ({
      expandedNodes: { ...state.expandedNodes, [nodePath]: value },
    })),

  /** Open all ancestor dirs of the given file path */
  expandToFile: (filePath) => {
    const parts = filePath.replace('\\', '/').split('/');
    const toExpand = {};
    let built = '';
    for (let i = 0; i < parts.length - 1; i++) {
      built = built ? `${built}/${parts[i]}` : parts[i];
      toExpand[built] = true;
    }
    set((state) => ({ expandedNodes: { ...state.expandedNodes, ...toExpand } }));
  },

  resetTree: () => set({ treeData: null, expandedNodes: {}, treeLoading: false, treeError: null }),
}));

export default useGraphSyncStore;
