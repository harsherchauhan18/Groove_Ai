import { create } from 'zustand';

/**
 * Zustand store for Bi-directional synchronization between the Graph view and Monaco Editor.
 * Manages active highlights and handles line-to-function mapping logic for the navigator.
 */
const useGraphSyncStore = create((set, get) => ({
  // State
  activeNodeId: null,
  activeFilePath: null,
  activeLine: 1,
  functionMappings: [], // List of { id, file_path, name, start_line, end_line }

  // Actions
  
  /**
   * Sets the master list of function mappings for the repository.
   * Sorts mappings by start_line on write to ensure optimized search lookups.
   */
  setFunctionMappings: (mappings) => {
    const sorted = [...mappings].sort((a, b) => a.start_line - b.start_line);
    set({ functionMappings: sorted });
  },

  /**
   * Update the active node based on graph interaction.
   * This is triggered by a node click in the Graph viewer.
   */
  setActiveNode: (nodeId, filePath, line) => {
    set({
      activeNodeId: nodeId,
      activeFilePath: filePath,
      activeLine: line || 1
    });
  },

  /**
   * Update the active line based on editor interaction.
   * Determines if the cursor is within a function boundary to highlight on the graph.
   */
  setActiveLine: (filePath, line) => {
    const { functionMappings, activeNodeId } = get();
    
    // Efficiently locate the function object containing this line in the current active file
    const matchedFunction = functionMappings.find(func => 
      func.file_path === filePath && 
      line >= func.start_line && 
      line <= func.end_line
    );

    // Only commit state changes if the active node/function identity has actually shifted
    if (matchedFunction) {
      if (activeNodeId !== matchedFunction.id) {
        set({ 
          activeNodeId: matchedFunction.id, 
          activeFilePath: filePath,
          activeLine: line 
        });
      }
    } else {
      // Clear function-level highlighting if the cursor moves outside known function boundaries
      if (activeNodeId !== null) {
        set({ activeNodeId: null, activeLine: line });
      } else {
        set({ activeLine: line });
      }
    }
  }
}));

export default useGraphSyncStore;
