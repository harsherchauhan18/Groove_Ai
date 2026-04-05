import React, { useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import useGraphSyncStore from '../../store/useGraphSyncStore';

/**
 * Custom Node component with active highlight state for function and file types.
 */
const FunctionNode = ({ data }) => {
  const activeNodeId = useGraphSyncStore((state) => state.activeNodeId);
  const isActive = activeNodeId === data.id;

  return (
    <motion.div
      animate={{ 
        scale: isActive ? 1.12 : 1,
        borderColor: isActive ? '#6366f1' : 'rgba(255,255,255,0.08)'
      }}
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.75)',
        border: '2px solid',
        color: isActive ? '#f8fafc' : '#94a3b8',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        minWidth: '130px',
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
        boxShadow: isActive ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none'
      }}
    >
      <div style={{ color: isActive ? '#818cf8' : '#64748b', fontSize: '0.6rem', marginBottom: '4px', textTransform: 'uppercase' }}>
        {data.type || 'FUNCTION'}
      </div>
      {data.label}
    </motion.div>
  );
};

const nodeTypes = {
  function: FunctionNode,
  file: FunctionNode
};

export default function RepoGraphViewer({ nodes: initialNodes, edges: initialEdges }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const { setActiveNode } = useGraphSyncStore();

  useEffect(() => {
    // Transform raw backend graph data into React Flow compatible node and edge formats.
    const formattedNodes = (initialNodes || []).map(n => ({
      id: n.id,
      type: n.type || 'function',
      position: n.position || { x: Math.random() * 600, y: Math.random() * 600 },
      data: { 
        label: n.name, 
        filePath: n.file_path, 
        startLine: n.start_line,
        id: n.id,
        type: n.type || 'function'
      }
    }));

    const formattedEdges = (initialEdges || []).map(e => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      animated: true,
      style: { stroke: 'rgba(99, 102, 241, 0.4)', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'rgba(99, 102, 241, 0.4)',
      },
    }));

    setNodes(formattedNodes);
    setEdges(formattedEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  /**
   * Dispatches the active node and handles scrolling in the Monaco Editor.
   */
  const onNodeClick = useCallback((event, node) => {
    setActiveNode(node.id, node.data.filePath, node.data.startLine);
  }, [setActiveNode]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#080c14', borderRadius: '1rem', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
