import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Binary, Braces, FileCode2, FileJson, FileText, Info } from 'lucide-react';
import useCodebaseStore from '../../store/useCodebaseStore.js';

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx': return <FileCode2 size={16} className="text-blue-400" />;
    case 'json': return <FileJson size={16} className="text-yellow-400" />;
    case 'py': return <Braces size={16} className="text-green-400" />;
    case 'md': return <FileText size={16} className="text-purple-400" />;
    case 'yaml':
    case 'yml': return <Binary size={16} className="text-orange-400" />;
    default: return <File size={16} className="text-gray-400" />;
  }
};

const FileTreeItem = ({ item, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(depth < 1); // Auto-open root folders
  const { setActiveFilePath, activeFilePath } = useCodebaseStore();
  
  const isFolder = !!item.children;
  const isSelected = activeFilePath === item.path;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      setActiveFilePath(item.path);
    }
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleClick}
        className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer transition-all border-l-2 ${
          isSelected 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]' 
            : 'text-gray-400 border-transparent hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center">
          {isFolder ? (
            isOpen ? <ChevronDown size={14} className="opacity-60" /> : <ChevronRight size={14} className="opacity-60" />
          ) : null}
        </span>
        
        <span className="flex items-center gap-2 min-w-0">
          {isFolder ? (
            isOpen ? <FolderOpen size={16} className="text-amber-400/80" /> : <Folder size={16} className="text-amber-400/80" />
          ) : (
            getFileIcon(item.name)
          )}
          <span className="truncate text-sm font-medium tracking-tight">{item.name}</span>
        </span>
      </div>
      
      {isFolder && isOpen && (
        <div className="overflow-hidden">
          {Object.values(item.children)
            .sort((a,b) => (a.children ? -1 : 1) - (b.children ? -1 : 1) || a.name.localeCompare(b.name))
            .map((child, i) => (
              <FileTreeItem key={child.path} item={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
};

export default function FileExplorer() {
  const { repoTree } = useCodebaseStore();

  const treeData = useMemo(() => {
    const root = { name: 'root', children: {} };
    repoTree.forEach(path => {
      const parts = path.split('/');
      let current = root;
      parts.forEach((part, i) => {
        if (!current.children[part]) {
          current.children[part] = { 
            name: part, 
            path: parts.slice(0, i + 1).join('/'),
            children: i === parts.length - 1 ? null : {} 
          };
        }
        current = current.children[part];
      });
    });
    return root.children;
  }, [repoTree]);

  if (!repoTree || repoTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 p-6 text-center">
        <Info size={32} strokeWidth={1.5} className="opacity-20" />
        <p className="text-xs font-medium">Parsing repository structure...</p>
        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 animate-[loading_1.5s_infinite]" style={{ width: '40%' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-white/10">
      {Object.values(treeData)
        .sort((a,b) => (a.children ? -1 : 1) - (b.children ? -1 : 1) || a.name.localeCompare(b.name))
        .map((item) => (
          <FileTreeItem key={item.path} item={item} />
        ))}
    </div>
  );
}
