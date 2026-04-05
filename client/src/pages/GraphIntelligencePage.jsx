import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, Code2, Cpu, GitBranch, Layers, AlertTriangle,
  Zap, ChevronRight, X, BarChart3, RefreshCw, Loader2,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar.jsx';
import RepoGraphViewer from '../components/graph/RepoGraphViewer.jsx';
import CodeViewer from '../components/editor/CodeViewer.jsx';
import useGraphSyncStore from '../store/useGraphSyncStore.js';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

// ── Stat card for top bar ──────────────────────────────────────────────────
function StatCard({ icon, label, value, warn }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 16px', borderRadius: '10px',
      background: 'rgba(22,27,34,0.8)', border: '1px solid #30363d',
    }}>
      <span style={{ color: warn && value === 0 ? '#f0883e' : '#6e7681' }}>{icon}</span>
      <div>
        <div style={{ color: '#6e7681', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
          {label}
        </div>
        <div style={{ color: warn && value === 0 ? '#f0883e' : '#f0f6fc', fontWeight: '800', fontSize: '1rem', lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ── Node type badge ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  file:     { color: '#3fb950', bg: 'rgba(63,185,80,0.12)',  label: 'FILE' },
  function: { color: '#58a6ff', bg: 'rgba(31,111,235,0.12)', label: 'FUNCTION' },
  class:    { color: '#bc8cff', bg: 'rgba(137,87,229,0.12)', label: 'CLASS' },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.file;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: '800',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}55`,
      letterSpacing: '0.05em',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Sidebar panel ────────────────────────────────────────────────────────────
function IntelligenceSidebar({ nodes, edges, activeNodeId, onClose }) {
  const selectedNode = nodes.find(n => String(n.id) === String(activeNodeId));

  // Hotspots: top 5 nodes by incoming edge count
  const incomingCounts = {};
  edges.forEach(e => {
    incomingCounts[e.to] = (incomingCounts[e.to] || 0) + 1;
  });
  const hotspots = Object.entries(incomingCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ node: nodes.find(n => String(n.id) === id), count }))
    .filter(({ node }) => node);

  // Nodes missing line info
  const noLineNodes = nodes.filter(n => !n.start_line || n.start_line === 0);

  return (
    <motion.div
      initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      style={{
        width: 300, flexShrink: 0, background: '#161b22',
        borderLeft: '1px solid #30363d', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #30363d',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ color: '#8b949e', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Intelligence Panel
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer', padding: '2px' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Selected Node Card */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #21262d' }}>
        <div style={{ color: '#6e7681', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Selected Node
        </div>
        {selectedNode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TypeBadge type={selectedNode.type} />
              <span style={{ color: '#f0f6fc', fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedNode.name}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6e7681', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.5' }}>
              {selectedNode.file_path}
            </div>
            {selectedNode.start_line ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#8b949e' }}>
                  Start: <span style={{ color: '#58a6ff', fontWeight: '600' }}>L{selectedNode.start_line}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8b949e' }}>
                  End: <span style={{ color: '#58a6ff', fontWeight: '600' }}>L{selectedNode.end_line}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(240,136,62,0.1)', border: '1px solid rgba(240,136,62,0.3)', borderRadius: '5px', color: '#f0883e' }}>
                ⚠ Line info unavailable
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: '#8b949e' }}>
              Incoming refs: <span style={{ color: '#f0f6fc', fontWeight: '600' }}>{incomingCounts[String(selectedNode.id)] || 0}</span>
            </div>
          </div>
        ) : (
          <p style={{ color: '#484f58', fontSize: '0.8rem' }}>Click a node in the graph</p>
        )}
      </div>

      {/* Insights */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #21262d' }}>
        <div style={{ color: '#6e7681', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Insights
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', background: '#0d1117', borderRadius: '7px',
            border: noLineNodes.length > 0 ? '1px solid rgba(240,136,62,0.3)' : '1px solid #21262d',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>Nodes missing lines</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: noLineNodes.length > 0 ? '#f0883e' : '#3fb950' }}>
              {noLineNodes.length}
            </span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', background: '#0d1117', borderRadius: '7px', border: '1px solid #21262d',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>Total edges</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f0f6fc' }}>{edges.length}</span>
          </div>
        </div>
      </div>

      {/* Hotspots */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ color: '#6e7681', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Top Hotspots
        </div>
        {hotspots.length === 0 ? (
          <p style={{ color: '#484f58', fontSize: '0.78rem' }}>No edge data yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {hotspots.map(({ node, count }, i) => (
              <div key={String(node.id)} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', background: '#0d1117', borderRadius: '7px', border: '1px solid #21262d',
              }}>
                <span style={{ color: '#484f58', fontSize: '0.7rem', fontWeight: '700', width: 14, textAlign: 'center' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: '0.75rem', color: '#c9d1d9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.name}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#f0883e', flexShrink: 0 }}>{count} refs</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GraphIntelligencePage() {
  const { repoId } = useParams();
  const navigate = useNavigate();

  const { setFunctionMappings, activeNodeId } = useGraphSyncStore();

  const [graphNodes, setGraphNodes] = useState([]);
  const [graphEdges, setGraphEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [splitPos, setSplitPos] = useState(58); // % for graph panel
  const isDragging = useRef(false);

  const token = localStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  // ── Computed stats ─────────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    const fnCount = graphNodes.filter(n => n.type === 'function').length;
    let maxDepth = 0;
    if (graphEdges.length > 0) {
      // BFS max depth
      const adj = {};
      const inDeg = {};
      graphNodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
      graphEdges.forEach(e => {
        if (adj[e.from]) adj[e.from].push(e.to);
        inDeg[e.to] = (inDeg[e.to] || 0) + 1;
      });
      const queue = graphNodes.filter(n => !inDeg[n.id]).map(n => ({ id: n.id, d: 0 }));
      const visited = new Set();
      while (queue.length) {
        const { id, d } = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        maxDepth = Math.max(maxDepth, d);
        (adj[id] || []).forEach(nxt => queue.push({ id: nxt, d: d + 1 }));
      }
    }
    return {
      nodes: graphNodes.length,
      functions: fnCount,
      edges: graphEdges.length,
      maxDepth,
    };
  }, [graphNodes, graphEdges]);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setError(null);

    const [fnRes, graphRes] = await Promise.allSettled([
      axios.get(`${FASTAPI_URL}/api/functions/${repoId}`, { headers }),
      axios.get(`${FASTAPI_URL}/api/graph/visualization/${repoId}`, { headers }),
    ]);

    if (fnRes.status === 'fulfilled') {
      const fns = Array.isArray(fnRes.value.data) ? fnRes.value.data : [];
      setFunctionMappings(fns);
    }

    if (graphRes.status === 'fulfilled') {
      const gd = graphRes.value.data || {};
      setGraphNodes(Array.isArray(gd.nodes) ? gd.nodes : []);
      setGraphEdges(Array.isArray(gd.edges) ? gd.edges : []);
    } else {
      setError('Could not load graph data. Ensure FastAPI is running and this repo has been parsed.');
    }

    setLoading(false);
  }, [repoId, token]);

  useEffect(() => {
    if (!repoId) { navigate('/dashboard', { replace: true }); return; }
    fetchData();
  }, [repoId]);

  // ── Resizable divider ──────────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (mv) => {
      if (!isDragging.current) return;
      const pct = (mv.clientX / window.innerWidth) * 100;
      setSplitPos(Math.min(80, Math.max(25, pct)));
    };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div style={{ display: 'flex', background: '#0d1117', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top Stats Bar ──────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 20px', background: '#161b22', borderBottom: '1px solid #30363d',
          flexShrink: 0, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto' }}>
            <div style={{ padding: '7px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)', display: 'flex' }}>
              <Share2 size={16} color="#818cf8" />
            </div>
            <div>
              <div style={{ color: '#f0f6fc', fontWeight: '800', fontSize: '1rem' }}>
                Graph <span style={{ color: '#6366f1' }}>Intelligence</span>
              </div>
              <div style={{ color: '#6e7681', fontSize: '0.7rem' }}>{repoId}</div>
            </div>
          </div>

          <StatCard icon={<Layers size={15}/>} label="Nodes" value={stats.nodes} />
          <StatCard icon={<Cpu size={15}/>} label="Functions" value={stats.functions} warn />
          <StatCard icon={<GitBranch size={15}/>} label="Edges" value={stats.edges} />
          <StatCard icon={<BarChart3 size={15}/>} label="Max Depth" value={stats.maxDepth} />

          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 14px', borderRadius: '8px',
              border: '1px solid #30363d', background: 'rgba(255,255,255,0.03)',
              color: '#6e7681', cursor: 'pointer', fontSize: '0.75rem',
            }}
          >
            <motion.span animate={loading ? { rotate: 360 } : {}} transition={loading ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}>
              <RefreshCw size={12} />
            </motion.span>
            Refresh
          </button>

          <button
            onClick={() => setShowSidebar(s => !s)}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: '1px solid #30363d',
              background: showSidebar ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
              color: showSidebar ? '#818cf8' : '#6e7681', cursor: 'pointer', fontSize: '0.75rem',
              fontWeight: '600',
            }}
          >
            {showSidebar ? 'Hide' : 'Show'} Panel
          </button>
        </div>

        {/* ── Main Content ───────────────────────────────────────────── */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <Loader2 size={40} color="#6366f1" />
            </motion.div>
            <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>Loading graph intelligence…</div>
            <div style={{ color: '#484f58', fontSize: '0.75rem' }}>Fetching functions + graph from {FASTAPI_URL}</div>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <AlertTriangle size={40} color="#f0883e" />
            <div style={{ color: '#f0883e', fontSize: '0.9rem', maxWidth: 400, textAlign: 'center' }}>{error}</div>
            <button onClick={fetchData} style={{ color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
              Retry
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Graph panel */}
            <div style={{ width: `${splitPos}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '6px 14px', background: '#161b22', borderBottom: '1px solid #30363d', fontSize: '0.7rem', color: '#6e7681', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <Share2 size={11} color="#6366f1" /> DAG Graph — Click node to open file
                {graphNodes.length === 0 && (
                  <span style={{ marginLeft: 'auto', color: '#f0883e', fontSize: '0.65rem' }}>
                    ⚠ No graph data — parse this repository first
                  </span>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <RepoGraphViewer nodes={graphNodes} edges={graphEdges} />
              </div>
            </div>

            {/* Resizable divider */}
            <div
              onMouseDown={onDividerMouseDown}
              style={{
                width: 4, background: '#21262d', cursor: 'col-resize', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
              onMouseLeave={e => e.currentTarget.style.background = '#21262d'}
            />

            {/* Code + sidebar panel */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Monaco */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1117' }}>
                <div style={{ padding: '6px 14px', background: '#161b22', borderBottom: '1px solid #30363d', fontSize: '0.7rem', color: '#6e7681', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <Code2 size={11} color="#3fb950" /> Code Viewer — bi-directional sync with graph
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <CodeViewer repoId={repoId} />
                </div>
              </div>

              {/* Intelligence Sidebar */}
              <AnimatePresence>
                {showSidebar && (
                  <IntelligenceSidebar
                    nodes={graphNodes}
                    edges={graphEdges}
                    activeNodeId={activeNodeId}
                    onClose={() => setShowSidebar(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
