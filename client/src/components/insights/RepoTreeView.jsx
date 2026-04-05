import React, { useState } from 'react';
import { 
  Folder, FileCode, ChevronDown, ChevronRight,
  Zap, Clock, GitBranch,
  Activity, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useInsightsStore from '../../store/useInsightsStore';

const TreeNode = ({ node, depth = 0, repoId }) => {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const { selectedFile, selectFile } = useInsightsStore();
  
  const isFile = node.type === 'file';
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFile === node.path;
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (isFile) {
       selectFile(repoId, node.path);
    } else {
       setIsOpen(!isOpen);
    }
  };

  const getComplexityColor = (c) => {
     if (c === 'high') return '#ef4444'; // Red
     if (c === 'medium') return '#f59e0b'; // Amber
     return '#10b981'; // Green
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <div 
        className={`tree-item ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '8px',
          cursor: 'pointer',
          color: isSelected ? '#fff' : '#94a3b8',
          background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
          marginBottom: '4px',
          fontSize: '0.85rem',
          transition: 'all 0.2s',
          border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
        }}
      >
        {!isFile && (
           <motion.span animate={{ rotate: isOpen ? 90 : 0 }}>
              <ChevronRight size={14} color="#64748b" />
           </motion.span>
        )}
        {isFile ? <FileCode size={16} color="#6366f1" /> : <Folder size={16} color="#3b82f6" fill={isOpen ? "rgba(59, 130, 246, 0.2)" : "none"} />}
        
        <span className="node-name" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isFile ? '500' : '600' }}>
          {node.name}
        </span>

        {isFile && node.complexity && (
           <div style={{ 
             width: '6px', 
             height: '6px', 
             borderRadius: '50%', 
             background: getComplexityColor(node.complexity),
             boxShadow: `0 0 10px ${getComplexityColor(node.complexity)}`
           }} title={`Complexity: ${node.complexity}`} />
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            {node.children.map((child, i) => (
               <TreeNode key={i} node={child} depth={depth + 1} repoId={repoId} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function RepoTreeView({ repoId }) {
  const treeData = useInsightsStore(state => state.insights.treeData);

  if (!treeData) return (
     <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>
        <p style={{ fontSize: '0.85rem' }}>Visualizing codebase structure...</p>
     </div>
  );

  return (
    <div className="tree-container">
      <TreeNode node={treeData} repoId={repoId} />
    </div>
  );
}
