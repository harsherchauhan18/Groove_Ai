import React, { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderOpen, ChevronRight,
  FileCode, FileText, FileJson, FileCog,
  Search, X, RefreshCw
} from 'lucide-react';

// ── File icon by extension ──────────────────────────────────────────────────
const EXT_ICON_MAP = {
  js: { color: '#f59e0b' }, jsx: { color: '#f59e0b' },
  ts: { color: '#3b82f6' }, tsx: { color: '#3b82f6' },
  py: { color: '#10b981' }, go: { color: '#06b6d4' },
  rs: { color: '#f59e0b' }, java: { color: '#f87171' },
  css: { color: '#ec4899' }, scss: { color: '#ec4899' },
  json: { color: '#f97316' }, yaml: { color: '#a78bfa' }, yml: { color: '#a78bfa' },
  md: { color: '#94a3b8' }, html: { color: '#ef4444' },
  sh: { color: '#94a3b8' }, txt: { color: '#64748b' },
};

function getExtColor(filename) {
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  return EXT_ICON_MAP[ext]?.color || '#64748b';
}

function FileIcon({ name, size = 14 }) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const color = EXT_ICON_MAP[ext]?.color || '#64748b';
  if (['json', 'yaml', 'yml', 'toml'].includes(ext))
    return <FileJson size={size} color={color} />;
  if (['sh', 'bash', 'zsh', 'ps1'].includes(ext))
    return <FileCog size={size} color={color} />;
  if (['md', 'txt', 'rst'].includes(ext))
    return <FileText size={size} color={color} />;
  return <FileCode size={size} color={color} />;
}

// ── Complexity badge ─────────────────────────────────────────────────────────
const BADGE = {
  high:   { color: '#ef4444', label: '●' },
  medium: { color: '#f59e0b', label: '●' },
  low:    { color: '#10b981', label: '●' },
};

function ComplexityDot({ level }) {
  const cfg = BADGE[level] || BADGE.low;
  return (
    <span title={`${level} complexity`} style={{
      fontSize: '8px', color: cfg.color, lineHeight: 1, flexShrink: 0
    }}>{cfg.label}</span>
  );
}

// ── GLobal search filter ─────────────────────────────────────────────────────
function filterTree(node, query) {
  if (!query) return node;
  const q = query.toLowerCase();
  if (node.type === 'file') {
    return node.name.toLowerCase().includes(q) ? node : null;
  }
  // dir
  const filteredChildren = (node.children || [])
    .map(c => filterTree(c, query))
    .filter(Boolean);
  if (filteredChildren.length === 0) return null;
  return { ...node, children: filteredChildren };
}

// ── Single tree node ─────────────────────────────────────────────────────────
const TreeNode = memo(function TreeNode({
  node, depth, selectedPath, expandedNodes, onFileClick, onToggle, searchActive
}) {
  const isDir = node.type === 'dir';
  const isOpen = searchActive || expandedNodes[node.path];
  const isSelected = selectedPath === node.path;
  const indentPx = depth * 14;

  if (isDir) {
    return (
      <div>
        <div
          onClick={() => onToggle(node.path)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            paddingLeft: `${indentPx + 8}px`, paddingRight: '8px',
            height: '28px', cursor: 'pointer', borderRadius: '5px',
            margin: '0 4px 1px',
            background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
            transition: 'background 0.1s',
            userSelect: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = isOpen ? 'rgba(255,255,255,0.03)' : 'transparent'}
        >
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ display: 'flex', flexShrink: 0 }}
          >
            <ChevronRight size={12} color="#64748b" />
          </motion.span>
          {isOpen
            ? <FolderOpen size={14} color="#60a5fa" fill="rgba(96,165,250,0.12)" />
            : <Folder size={14} color="#3b82f6" />
          }
          <span style={{
            fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '500',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            letterSpacing: '-0.01em',
          }}>
            {node.name}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#374151', flexShrink: 0 }}>
            {(node.children || []).length}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              {(node.children || []).map(child => (
                <TreeNode
                  key={child.path || child.name}
                  node={child}
                  depth={depth + 1}
                  selectedPath={selectedPath}
                  expandedNodes={expandedNodes}
                  onFileClick={onFileClick}
                  onToggle={onToggle}
                  searchActive={searchActive}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // File node
  return (
    <div
      onClick={() => onFileClick(node)}
      title={node.path}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        paddingLeft: `${indentPx + 8}px`, paddingRight: '8px',
        height: '26px', cursor: 'pointer', borderRadius: '5px',
        margin: '0 4px 1px',
        background: isSelected
          ? 'rgba(99, 102, 241, 0.18)'
          : 'transparent',
        outline: isSelected ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
        transition: 'all 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ width: 12, flexShrink: 0 }} />
      <FileIcon name={node.name} size={13} />
      <span style={{
        fontSize: '0.8rem',
        color: isSelected ? '#c7d2fe' : '#94a3b8',
        fontWeight: isSelected ? '600' : '400',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        letterSpacing: '-0.01em',
      }}>
        {node.name}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {node.loc > 0 && (
          <span style={{ fontSize: '0.6rem', color: '#334155', fontFamily: 'monospace' }}>
            {node.loc}L
          </span>
        )}
        {node.complexity && <ComplexityDot level={node.complexity} />}
      </div>
    </div>
  );
});

// ── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{
      padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', gap: '10px', flexWrap: 'wrap'
    }}>
      {[['high', '#ef4444'], ['medium', '#f59e0b'], ['low', '#10b981']].map(([label, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#475569' }}>
          <span style={{ color, fontSize: '8px' }}>●</span> {label}
        </div>
      ))}
      <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#374155' }}>complexity</span>
    </div>
  );
}

// ── Main FileTree component ──────────────────────────────────────────────────
export default function FileTree({
  treeData,
  loading,
  error,
  selectedPath,
  expandedNodes,
  onFileClick,
  onToggle,
  onRefresh,
}) {
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  // keyboard shortcut: Ctrl+F focuses search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && searchRef.current) {
        e.preventDefault();
        searchRef.current.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredTree = treeData && search
    ? filterTree(treeData, search)
    : treeData;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(9, 12, 22, 0.95)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', flexShrink: 0,
      }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: '700', color: '#475569',
          textTransform: 'uppercase', letterSpacing: '0.1em'
        }}>
          EXPLORER
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh tree"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#374151', padding: '2px', borderRadius: '4px',
            display: 'flex', alignItems: 'center',
          }}
        >
          <motion.span animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={loading ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}>
            <RefreshCw size={12} color={loading ? '#6366f1' : '#475569'} />
          </motion.span>
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: '6px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={11} color="#374151" style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none'
          }} />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter… (Ctrl+F)"
            style={{
              width: '100%', padding: '5px 26px 5px 26px',
              background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px', color: '#cbd5e1', fontSize: '0.75rem', outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px',
              }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Tree body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
              <RefreshCw size={18} color="#6366f1" />
            </motion.div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Loading tree…</span>
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#f87171', fontSize: '0.75rem' }}>{error}</p>
            <button onClick={onRefresh} style={{ marginTop: '8px', fontSize: '0.7rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : !filteredTree || !filteredTree.children?.length ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            {search ? (
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>No files match <strong style={{ color: '#94a3b8' }}>"{search}"</strong></p>
            ) : (
              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5' }}>
                No files parsed yet.<br />Ingest a repository to populate the tree.
              </p>
            )}
          </div>
        ) : (
          (filteredTree.children || []).map(child => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              depth={0}
              selectedPath={selectedPath}
              expandedNodes={expandedNodes}
              onFileClick={onFileClick}
              onToggle={onToggle}
              searchActive={!!search}
            />
          ))
        )}
      </div>

      <Legend />
    </div>
  );
}
