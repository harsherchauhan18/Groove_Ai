import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  FolderTree, Network, List, RefreshCw,
  FileCode, Folder, X, ChevronRight,
  Loader2, AlertCircle, FolderOpen,
  BarChart3, Code2, LayoutGrid,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar.jsx';
import FileTree from '../components/tree/FileTree.jsx';
import useGraphSyncStore from '../store/useGraphSyncStore.js';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

// ── Monaco language detection ─────────────────────────────────────────────
function getLang(filename) {
  if (!filename) return 'plaintext';
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', go: 'go', rs: 'rust', java: 'java', rb: 'ruby',
    cs: 'csharp', cpp: 'cpp', c: 'c', php: 'php',
    css: 'css', scss: 'scss', html: 'html', json: 'json',
    yaml: 'yaml', yml: 'yaml', md: 'markdown', sh: 'shell',
    toml: 'toml', sql: 'sql', txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

// ── Graph node custom renderer ────────────────────────────────────────────
const GraphNode = ({ data }) => (
  <div style={{
    padding: '8px 12px', borderRadius: '8px',
    background: data.isDir ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.85)',
    border: `1px solid ${data.isDir ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
    color: data.isDir ? '#93c5fd' : '#94a3b8',
    fontSize: '0.7rem', fontWeight: data.isDir ? '700' : '400',
    display: 'flex', alignItems: 'center', gap: '5px',
    minWidth: '100px', maxWidth: '170px',
    backdropFilter: 'blur(8px)',
    boxShadow: data.isDir ? '0 0 10px rgba(59,130,246,0.15)' : 'none',
  }}>
    {data.isDir ? <Folder size={11} color="#60a5fa" /> : <FileCode size={11} color="#64748b" />}
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {data.label}
    </span>
  </div>
);

const nodeTypes = { folder: GraphNode };

// ── Build ReactFlow graph from flat file list ─────────────────────────────
function buildFlowGraph(treeData) {
  const nodes = [], edges = [];
  const dirSeen = new Set();

  function walk(node, parentId = null) {
    const id = node.path || node.name;
    const isDir = node.type === 'dir';

    if (isDir && !dirSeen.has(id)) {
      dirSeen.add(id);
      nodes.push({
        id, type: 'folder',
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        data: { label: node.name, isDir: true, path: node.path },
      });
      if (parentId) edges.push({
        id: `${parentId}-${id}`, source: parentId, target: id,
        style: { stroke: 'rgba(59,130,246,0.25)', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(59,130,246,0.3)', width: 10, height: 10 },
      });
      (node.children || []).forEach(c => walk(c, id));
    } else if (!isDir) {
      nodes.push({
        id, type: 'folder',
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        data: { label: node.name, isDir: false, path: node.path },
      });
      if (parentId) edges.push({
        id: `${parentId}-${id}`, source: parentId, target: id,
        style: { stroke: 'rgba(255,255,255,0.07)', strokeWidth: 1 },
      });
    }
  }

  (treeData?.children || []).forEach(c => walk(c));
  return { nodes, edges };
}

// ── File bread-crumb header ───────────────────────────────────────────────
function FileBreadcrumb({ filePath, onClose }) {
  if (!filePath) return null;
  const parts = filePath.replace('\\', '/').split('/');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '6px 12px', background: 'rgba(15,23,42,0.5)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      fontSize: '0.75rem', color: '#64748b', flexShrink: 0, minHeight: 32,
    }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={10} color="#374151" />}
          <span style={{ color: i === parts.length - 1 ? '#94a3b8' : '#475569' }}>{p}</span>
        </React.Fragment>
      ))}
      <button
        onClick={onClose}
        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px', display: 'flex' }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────
function Stat({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#475569' }}>{icon}</span>
      <span style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: '#94a3b8', fontWeight: '700', fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function FolderExplorerPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();

  const {
    treeData, treeLoading, treeError,
    expandedNodes, activeFilePath,
    setTreeData, setTreeLoading, setTreeError,
    toggleExpand, expandToFile, setActiveNode, resetTree,
  } = useGraphSyncStore();

  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'graph'
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [stats, setStats] = useState({ files: 0, dirs: 0 });
  const editorRef = useRef(null);

  // ReactFlow state (only needed for graph mode)
  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';

  // ── Fetch tree ──────────────────────────────────────────────────────────
  const fetchTree = useCallback(async () => {
    if (!repoId) return;
    setTreeLoading(true);
    setTreeError(null);
    try {
      const { data } = await axios.get(`${FASTAPI_URL}/api/graph/tree/${repoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTreeData(data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load tree';
      setTreeError(msg);
    }
  }, [repoId, token]);

  // Initial load
  useEffect(() => {
    if (!repoId) { navigate('/dashboard', { replace: true }); return; }
    if (!treeData) fetchTree();
    return () => { /* don't reset — preserve tree on nav */ };
  }, [repoId]);

  // Compute stats when tree changes
  useEffect(() => {
    if (!treeData) return;
    let files = 0, dirs = 0;
    function walk(node) {
      if (node.type === 'file') files++;
      else { dirs++; (node.children || []).forEach(walk); }
    }
    (treeData.children || []).forEach(walk);
    setStats({ files, dirs });
  }, [treeData]);

  // Build ReactFlow graph when switching to graph mode
  useEffect(() => {
    if (viewMode === 'graph' && treeData) {
      const { nodes, edges } = buildFlowGraph(treeData);
      setRfNodes(nodes);
      setRfEdges(edges);
    }
  }, [viewMode, treeData]);

  // ── Fetch file content ─────────────────────────────────────────────────
  const openFile = useCallback(async (node) => {
    if (node.type !== 'file') return;
    setActiveNode(null, node.path, 1);
    expandToFile(node.path);
    setFileLoading(true);
    setFileError(null);
    setFileContent('');
    try {
      const { data } = await axios.get(`${FASTAPI_URL}/api/code/${repoId}`, {
        params: { filePath: node.path },
        headers: { Authorization: `Bearer ${token}` }
      });
      setFileContent(data.content || '// Empty file');
      // Scroll Monaco to top after load
      setTimeout(() => editorRef.current?.revealLine(1), 100);
    } catch (err) {
      if (err.response?.status === 404) {
        setFileError('File content not found in DB — it may not have been parsed yet.');
      } else {
        setFileError(err.response?.data?.detail || 'Failed to load file content.');
      }
    } finally {
      setFileLoading(false);
    }
  }, [repoId, token]);

  const handleGraphNodeClick = useCallback((_, node) => {
    if (!node.data.isDir) openFile({ type: 'file', path: node.data.path, name: node.data.label });
  }, [openFile]);

  const lang = getLang(activeFilePath || '');
  const hasFile = !!activeFilePath;

  // ── Toggle button style ────────────────────────────────────────────────
  const viewBtnStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
    fontSize: '0.75rem', fontWeight: '600', transition: 'all 0.12s',
    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
    color: active ? '#818cf8' : '#64748b',
    outline: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
  });

  return (
    <div style={{ display: 'flex', background: '#060914', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Page Header ──────────────────────────────────────────── */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.9rem 1.5rem',
          background: 'rgba(9,12,22,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
        }}>
          {/* Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '7px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', display: 'flex' }}>
              <FolderTree size={18} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f1f5f9', margin: 0 }}>
                Folder <span style={{ color: '#60a5fa' }}>Explorer</span>
              </h1>
              <p style={{ color: '#475569', fontSize: '0.7rem', margin: 0 }}>
                {repoId}
              </p>
            </div>
          </div>

          {/* Stats + view toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Stat icon={<Folder size={12}/>} label="Dirs" value={stats.dirs} />
            <Stat icon={<FileCode size={12}/>} label="Files" value={stats.files} />

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

            {/* Tree ↔ Graph toggle */}
            <div style={{ display: 'flex', gap: '2px', padding: '3px', background: 'rgba(255,255,255,0.03)', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button style={viewBtnStyle(viewMode === 'tree')} onClick={() => setViewMode('tree')}>
                <List size={13} /> Tree
              </button>
              <button style={viewBtnStyle(viewMode === 'graph')} onClick={() => setViewMode('graph')}>
                <Network size={13} /> Graph
              </button>
            </div>

            <button
              onClick={fetchTree}
              disabled={treeLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              <motion.span animate={treeLoading ? { rotate: 360 } : {}} transition={treeLoading ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}>
                <RefreshCw size={12} />
              </motion.span>
              Refresh
            </button>
          </div>
        </header>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {viewMode === 'tree' ? (
            <>
              {/* Left: VS Code-style File Tree */}
              <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <FileTree
                  treeData={treeData}
                  loading={treeLoading}
                  error={treeError}
                  selectedPath={activeFilePath}
                  expandedNodes={expandedNodes}
                  onFileClick={openFile}
                  onToggle={toggleExpand}
                  onRefresh={fetchTree}
                />
              </div>

              {/* Right: Monaco Editor */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1117' }}>
                <FileBreadcrumb
                  filePath={activeFilePath}
                  onClose={() => setActiveNode(null, null, 1)}
                />

                {fileLoading ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                      <Loader2 size={28} color="#6366f1" />
                    </motion.div>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Loading file…</span>
                  </div>
                ) : fileError ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                    <AlertCircle size={28} color="#f87171" />
                    <p style={{ color: '#f87171', fontSize: '0.8rem', maxWidth: 340, textAlign: 'center' }}>{fileError}</p>
                    <button
                      onClick={() => activeFilePath && openFile({ type: 'file', path: activeFilePath, name: activeFilePath.split('/').pop() })}
                      style={{ fontSize: '0.75rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Retry
                    </button>
                  </div>
                ) : !hasFile ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '2rem', background: 'rgba(15,23,42,0.5)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', maxWidth: 340 }}>
                      <FolderOpen size={40} color="rgba(99,102,241,0.3)" style={{ marginBottom: '1rem' }} />
                      <h3 style={{ color: '#94a3b8', fontWeight: '600', marginBottom: '8px', fontSize: '1rem' }}>
                        Select a file to view
                      </h3>
                      <p style={{ color: '#475569', fontSize: '0.8rem', lineHeight: '1.5' }}>
                        Click any file in the explorer on the left to open it here with syntax highlighting.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <Editor
                      language={lang}
                      value={fileContent}
                      theme="vs-dark"
                      onMount={(editor) => { editorRef.current = editor; }}
                      options={{
                        readOnly: true,
                        minimap: { enabled: true },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                        fontLigatures: true,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        renderWhitespace: 'selection',
                        smoothScrolling: true,
                        cursorBlinking: 'phase',
                        wordWrap: 'off',
                        padding: { top: 12 },
                        scrollbar: {
                          verticalScrollbarSize: 6,
                          horizontalScrollbarSize: 6,
                        },
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Graph Mode ─────────────────────────────────────────── */
            <div style={{ flex: 1, position: 'relative' }}>
              {treeLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                    <Network size={40} color="#6366f1" />
                  </motion.div>
                </div>
              ) : (
                <ReactFlow
                  nodes={rfNodes} edges={rfEdges}
                  onNodesChange={onRfNodesChange} onEdgesChange={onRfEdgesChange}
                  onNodeClick={handleGraphNodeClick}
                  nodeTypes={nodeTypes}
                  fitView fitViewOptions={{ padding: 0.2 }}
                >
                  <Background color="#1e293b" gap={24} size={1} />
                  <Controls showInteractive={false} />
                  <MiniMap
                    nodeColor={n => n.data?.isDir ? '#3b82f6' : '#334155'}
                    style={{ background: 'rgba(9,12,22,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                </ReactFlow>
              )}

              {/* Graph legend */}
              <div style={{
                position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '1rem', padding: '6px 14px',
                background: 'rgba(9,12,22,0.9)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', backdropFilter: 'blur(12px)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#64748b' }}>
                  <Folder size={11} color="#3b82f6" /> Directory
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#64748b' }}>
                  <FileCode size={11} color="#64748b" /> File (click to open)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
