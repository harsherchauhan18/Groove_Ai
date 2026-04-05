import React, { useEffect, useCallback } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import useCodebaseStore from '../../store/useCodebaseStore.js';

export default function RepoGraphViewer({ repoId }) {
  const { 
    repoGraph, 
    fetchGraph, 
    setActiveFilePath, 
    setActiveNodeId, 
    activeNodeId 
  } = useCodebaseStore();

  useEffect(() => {
    if (repoId) {
      fetchGraph(repoId);
    }
  }, [repoId, fetchGraph]);

  // Transform backend nodes to ReactFlow nodes with layout
  const nodes = repoGraph.nodes.map((n, i) => ({
    id: n.id,
    position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 150 }, // Simple grid layout
    data: { label: n.label.split('/').pop() },
    fullPath: n.id,
    style: { 
      background: activeNodeId === n.id ? '#4caf50' : '#222', 
      color: 'white', 
      border: '1px solid #444',
      fontSize: '12px',
      borderRadius: '8px',
      padding: '10px'
    }
  }));

  const edges = repoGraph.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: '#4caf50' }
  }));

  const onNodeClick = useCallback((event, node) => {
    setActiveNodeId(node.id);
    setActiveFilePath(node.fullPath);
  }, [setActiveNodeId, setActiveFilePath]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#000' }}>
      <ReactFlow 
        nodes={nodes.map(n => ({
          ...n,
          style: {
            ...n.style,
            border: activeNodeId === n.id ? '2px solid #4caf50' : n.style.border
          }
        }))} 
        edges={edges} 
        onNodeClick={onNodeClick}
        fitView
      >
        <Background color="#333" gap={16} />
        <Controls style={{ fill: 'white' }} />
      </ReactFlow>
    </div>
  );
}
