import React, { useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, Handle,
  useNodesState, useEdgesState, MarkerType, Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion } from 'framer-motion';
import useGraphSyncStore from '../../store/useGraphSyncStore';

// ── Color scheme ──────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  file:     { bg: 'rgba(63,185,80,0.12)',  border: '#3fb950', text: '#3fb950',  label: 'FILE' },
  function: { bg: 'rgba(31,111,235,0.12)', border: '#1f6feb', text: '#58a6ff',  label: 'FN' },
  class:    { bg: 'rgba(137,87,229,0.12)', border: '#8957e5', text: '#bc8cff',  label: 'CLASS' },
};

const NODE_W = 160;
const NODE_H = 52;

// ── Custom Node ───────────────────────────────────────────────────────────────
const GraphNode = ({ data }) => {
  const activeNodeId = useGraphSyncStore(s => s.activeNodeId);
  const isActive = activeNodeId === data.id;
  const cfg = TYPE_COLORS[data.nodeType] || TYPE_COLORS.function;
  const hasLines = data.startLine && data.startLine > 0;

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.08 : 1,
        boxShadow: isActive ? `0 0 18px ${cfg.border}88` : 'none',
      }}
      transition={{ duration: 0.18 }}
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        background: isActive ? `${cfg.bg.replace('0.12', '0.25')}` : cfg.bg,
        border: `1px solid ${isActive ? cfg.border : cfg.border + '66'}`,
        color: '#f0f6fc',
        width: NODE_W,
        minHeight: NODE_H,
        position: 'relative',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Type badge */}
      <div style={{
        position: 'absolute', top: -7, left: 8,
        fontSize: '0.55rem', fontWeight: '800',
        padding: '1px 5px', borderRadius: '4px',
        background: cfg.border, color: '#0d1117',
        letterSpacing: '0.05em',
      }}>
        {cfg.label}
      </div>

      {/* Name */}
      <div style={{
        fontSize: '0.8rem', fontWeight: '600', color: isActive ? '#ffffff' : '#d1d5db',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginTop: '6px',
      }}>
        {data.label}
      </div>

      {/* Line info or missing badge */}
      {hasLines ? (
        <div style={{ fontSize: '0.62rem', color: '#6b7280', marginTop: '2px' }}>
          L{data.startLine}–{data.endLine}
        </div>
      ) : (
        <div style={{
          display: 'inline-block', marginTop: '3px', padding: '1px 6px',
          fontSize: '0.6rem', borderRadius: '4px',
          background: 'rgba(240,136,62,0.2)', color: '#f0883e',
          border: '1px solid rgba(240,136,62,0.4)',
        }}>
          No lines
        </div>
      )}
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </motion.div>
  );
};

const nodeTypes = {
  graphNode: GraphNode,
};

// ── Dagre layout ──────────────────────────────────────────────────────────────
function applyDagreLayout(rawNodes, rawEdges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40, marginx: 30, marginy: 30 });

  rawNodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  rawEdges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return rawNodes.map(n => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    };
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RepoGraphViewer({ nodes: rawNodes = [], edges: rawEdges = [] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setActiveNode } = useGraphSyncStore();

  useEffect(() => {
    if (!rawNodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Map to ReactFlow node format
    const flowNodes = rawNodes.map(n => ({
      id: String(n.id),
      type: 'graphNode',
      position: { x: 0, y: 0 }, // dagre will overwrite
      data: {
        id: String(n.id),
        label: n.name || n.id,
        nodeType: n.type || 'file',
        filePath: n.file_path,
        startLine: n.start_line || 0,
        endLine: n.end_line || 0,
      },
    }));

    const flowEdges = rawEdges.map(e => ({
      id: `${e.from}-${e.to}`,
      source: String(e.from),
      target: String(e.to),
      animated: false,
      style: { stroke: 'rgba(99,102,241,0.3)', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 12, height: 12 },
    }));

    // Apply dagre BEFORE setting state (no layout flash)
    const laid = applyDagreLayout(flowNodes, flowEdges);
    setNodes(laid);
    setEdges(flowEdges);
  }, [rawNodes, rawEdges]);

  const onNodeClick = useCallback((_, node) => {
    setActiveNode(node.id, node.data.filePath, node.data.startLine || 1);
  }, [setActiveNode]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1117' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#21262d" gap={24} size={1} variant="dots" />
        <Controls showInteractive={false} style={{ background: '#161b22', border: '1px solid #30363d' }} />
        <MiniMap
          nodeColor={n => {
            const t = n.data?.nodeType || 'file';
            return TYPE_COLORS[t]?.border || '#3fb950';
          }}
          style={{ background: '#161b22', border: '1px solid #30363d' }}
        />
      </ReactFlow>
    </div>
  );
}
