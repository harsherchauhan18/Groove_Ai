import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MiniMap,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  FolderTree,
  Folder,
  FileCode,
  ChevronRight,
  ChevronDown,
  GitBranch,
  LayoutGrid,
  List,
  Network,
  RefreshCw,
  Search,
  X,
  Info,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar.jsx';
import useInsightsStore from '../store/useInsightsStore';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
const COLORS = { dir: '#3b82f6', js: '#f59e0b', ts: '#3b82f6', py: '#10b981', css: '#ec4899', md: '#94a3b8', json: '#f97316', other: '#64748b' };

function getFileColor(name) {
  const ext = name.split('.').pop().toLowerCase();
  return COLORS[ext] || COLORS.other;
}

// ── Tree View Node ──────────────────────────────────────────────────────────
function TreeNodeItem({ node, depth = 0, onSelect, selectedPath }) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === 'directory' || (node.children && node.children.length > 0);
  const isSelected = selectedPath === node.path;

  return (
    <div style={{ paddingLeft: depth > 0 ? '1.25rem' : 0 }}>
      <div
        onClick={() => isDir ? setOpen(!open) : onSelect(node)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
          background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
          border: `1px solid ${isSelected ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
          color: isSelected ? '#c7d2fe' : '#94a3b8',
          fontSize: '0.85rem', fontWeight: isDir ? '600' : '400',
          transition: 'all 0.15s', marginBottom: '2px',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        {isDir ? (
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight size={13} color="#64748b" />
          </motion.span>
        ) : <span style={{ width: 13 }} />}

        {isDir
          ? <Folder size={15} color={open ? '#60a5fa' : '#3b82f6'} fill={open ? 'rgba(59,130,246,0.15)' : 'none'} />
          : <FileCode size={15} color={getFileColor(node.name)} />
        }

        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>

        {!isDir && node.loc && (
          <span style={{ fontSize: '0.65rem', color: '#475569', flexShrink: 0 }}>{node.loc}L</span>
        )}
        {!isDir && node.complexity && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: node.complexity === 'high' ? '#ef4444' : node.complexity === 'medium' ? '#f59e0b' : '#10b981'
          }} />
        )}
      </div>

      <AnimatePresence>
        {open && isDir && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            {node.children.map((child, i) => (
              <TreeNodeItem
                key={i} node={child} depth={depth + 1}
                onSelect={onSelect} selectedPath={selectedPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Graph Node renderer ─────────────────────────────────────────────────────
const FolderGraphNode = ({ data }) => {
  const isDir = data.isDir;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: '10px',
      background: isDir ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.8)',
      border: `1px solid ${isDir ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
      color: isDir ? '#93c5fd' : '#94a3b8',
      fontSize: '0.75rem', fontWeight: isDir ? '700' : '400',
      display: 'flex', alignItems: 'center', gap: '6px',
      minWidth: '120px', maxWidth: '180px', backdropFilter: 'blur(8px)',
      boxShadow: isDir ? '0 0 12px rgba(59,130,246,0.2)' : 'none',
    }}>
      {isDir
        ? <Folder size={13} color="#60a5fa" />
        : <FileCode size={13} color={getFileColor(data.label)} />
      }
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.label}
      </span>
    </div>
  );
};

const nodeTypes = { folder: FolderGraphNode };

// ── Layout algorithm: simple hierarchical positioning ──────────────────────
function buildGraphFromTree(tree, parentId = null, depth = 0, xOffset = 0, yGap = 120, xGap = 180) {
  const nodes = [];
  const edges = [];
  const id = tree.path || tree.name || `node-${Math.random()}`;
  const isDir = tree.type === 'directory' || (tree.children && tree.children.length > 0);

  nodes.push({
    id,
    type: 'folder',
    position: { x: xOffset, y: depth * yGap },
    data: { label: tree.name, isDir, path: tree.path },
  });

  if (parentId) {
    edges.push({
      id: `${parentId}-${id}`,
      source: parentId,
      target: id,
      style: { stroke: isDir ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(59,130,246,0.3)', width: 12, height: 12 },
    });
  }

  if (tree.children && tree.children.length > 0) {
    const childWidth = xGap;
    const totalWidth = tree.children.length * childWidth;
    const startX = xOffset - totalWidth / 2 + childWidth / 2;

    tree.children.forEach((child, i) => {
      const { nodes: cn, edges: ce } = buildGraphFromTree(
        child, id, depth + 1, startX + i * childWidth, yGap, xGap
      );
      nodes.push(...cn);
      edges.push(...ce);
    });
  }

  return { nodes, edges };
}

// ── Stats Pill ──────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, color = '#6366f1' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '0.9rem' }}>{value}</span>
    </div>
  );
}

// ── File Info Panel ─────────────────────────────────────────────────────────
function FileInfoPanel({ node, onClose }) {
  if (!node) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '280px',
          background: 'rgba(10,15,25,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)', zIndex: 50, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FileCode size={16} color={getFileColor(node.name)} />
              <span style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '1rem' }}>{node.name}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'monospace' }}>{node.path}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            ['Lines of Code', node.loc ?? '—'],
            ['Complexity', node.complexity ?? '—'],
            ['Extension', node.name.split('.').pop().toUpperCase()],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{label}</span>
              <span style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '0.8rem' }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '10px 12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontSize: '0.7rem', fontWeight: '700', marginBottom: '6px' }}>
            <Info size={11} /> AI Insight
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.6' }}>
            Click "Deep Insights" in the sidebar to see full AI-powered analysis of this file.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function FolderExplorerPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { insights, fetchRepoInsights } = useInsightsStore();
  const treeData = insights?.treeData;
  const loading = insights?.loading ?? false;

  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'graph'
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ files: 0, dirs: 0, maxDepth: 0 });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!repoId) { navigate('/dashboard', { replace: true }); return; }
    if (!treeData) fetchRepoInsights(repoId);
  }, [repoId]);

  // Build graph nodes+edges whenever treeData changes and we're in graph mode
  useEffect(() => {
    if (treeData && viewMode === 'graph') {
      const { nodes: n, edges: e } = buildGraphFromTree(treeData);
      setNodes(n);
      setEdges(e);
    }
  }, [treeData, viewMode]);

  // Calculate stats from tree
  useEffect(() => {
    if (!treeData) return;
    let files = 0, dirs = 0;
    function walk(node, depth = 0) {
      if (node.type === 'file' || (!node.children?.length)) { files++; }
      else { dirs++; if (node.children) node.children.forEach(c => walk(c, depth + 1)); }
    }
    walk(treeData);
    setStats({ files, dirs });
  }, [treeData]);

  const handleNodeClick = useCallback((_, node) => {
    if (!node.data.isDir) setSelectedFile({ name: node.data.label, path: node.data.path });
  }, []);

  const filteredTree = treeData; // TODO: filter by search query

  const btnStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.15s',
    background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
    color: active ? '#818cf8' : '#64748b',
    outline: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
  });

  return (
    <div className="dashboard-container" style={{ display: 'flex', background: '#060914', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          padding: '1.25rem 2rem',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.25)' }}>
              <FolderTree size={20} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f1f5f9' }}>
                Folder <span style={{ color: '#60a5fa' }}>Explorer</span>
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                Visual structure of <span style={{ color: '#94a3b8', fontWeight: '600' }}>{repoId}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <StatPill icon={<Folder size={13}/>} label="Dirs" value={stats.dirs} color="#3b82f6" />
            <StatPill icon={<FileCode size={13}/>} label="Files" value={stats.files} color="#10b981" />

            {/* View mode toggle */}
            <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button style={btnStyle(viewMode === 'tree')} onClick={() => setViewMode('tree')}>
                <List size={15} /> Tree
              </button>
              <button style={btnStyle(viewMode === 'graph')} onClick={() => setViewMode('graph')}>
                <Network size={15} /> Graph
              </button>
            </div>

            <button
              onClick={() => fetchRepoInsights(repoId)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
                <FolderTree size={48} color="#3b82f6" />
              </motion.div>
              <p style={{ color: '#94a3b8', fontWeight: '500' }}>Mapping Repository Structure...</p>
            </div>
          ) : !treeData ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
              <div style={{ padding: '2rem 3rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '1.5rem', textAlign: 'center', maxWidth: '500px' }}>
                <FolderTree size={48} color="rgba(59,130,246,0.4)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: '#f1f5f9', fontWeight: '700', marginBottom: '0.5rem' }}>No Tree Data</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  The folder structure for <strong style={{ color: '#94a3b8' }}>{repoId}</strong> hasn't been mapped yet.
                  Parse the repository in the Dashboard to generate the structure.
                </p>
              </div>
            </div>
          ) : viewMode === 'tree' ? (
            // ── TREE VIEW ──────────────────────────────────────────────────
            <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
              
              {/* Search + Tree */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Search bar */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Filter files..."
                      style={{
                        width: '100%', padding: '8px 12px 8px 36px',
                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '8px', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none',
                      }}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tree scroll area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {[['Folder', '#3b82f6'], ['JS/TS', '#f59e0b'], ['Python', '#10b981'], ['CSS', '#ec4899'], ['Other', '#64748b']].map(([label, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#64748b' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        {label}
                      </div>
                    ))}
                  </div>

                  <TreeNodeItem
                    node={filteredTree}
                    depth={0}
                    selectedPath={selectedFile?.path}
                    onSelect={(node) => setSelectedFile(node)}
                  />
                </div>
              </div>

              {/* File detail panel */}
              {selectedFile && (
                <div style={{ position: 'relative', width: '280px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  <FileInfoPanel node={selectedFile} onClose={() => setSelectedFile(null)} />
                </div>
              )}
            </div>
          ) : (
            // ── GRAPH VIEW ─────────────────────────────────────────────────
            <div style={{ width: '100%', height: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
              >
                <Background color="#1e293b" gap={20} />
                <Controls showInteractive={false} />
                <MiniMap
                  nodeColor={(n) => n.data?.isDir ? '#3b82f6' : '#334155'}
                  style={{ background: 'rgba(10,15,25,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </ReactFlow>

              {/* Graph overlay legend */}
              <div style={{
                position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '1rem', padding: '8px 16px',
                background: 'rgba(10,15,25,0.9)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', backdropFilter: 'blur(12px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                  <Folder size={12} color="#3b82f6" /> Directory
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                  <FileCode size={12} color="#94a3b8" /> File
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Click a node to inspect</div>
              </div>

              {/* Graph selected file card */}
              {selectedFile && (
                <div style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  padding: '1rem 1.25rem',
                  background: 'rgba(10,15,25,0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', backdropFilter: 'blur(16px)',
                  width: '240px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '0.9rem' }}>{selectedFile.name}</span>
                    <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'monospace', marginBottom: '8px' }}>{selectedFile.path}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: '4px', fontSize: '0.7rem', color: '#818cf8' }}>
                      .{selectedFile.name.split('.').pop()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
