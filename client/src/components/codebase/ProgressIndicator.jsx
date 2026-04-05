import React, { useEffect, useState } from 'react';
import useCodebaseStore from '../../store/useCodebaseStore.js';
import { Loader } from 'lucide-react';

export default function ProgressIndicator({ repoId }) {
  const { pollRepositoryStatus, repoStatusMap } = useCodebaseStore();
  const [dots, setDots] = useState('');

  const status = repoStatusMap[repoId] || 'processing';

  useEffect(() => {
    let interval;
    if (status !== 'completed' && status !== 'failed') {
      interval = setInterval(() => {
        pollRepositoryStatus(repoId);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [repoId, status, pollRepositoryStatus]);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  const getStatusText = () => {
    switch(status) {
      case 'processing': return 'Initializing engine';
      case 'cloning': return 'Cloning repository';
      case 'parsing': return 'Parsing functions';
      case 'embedding': return 'Embedding code';
      case 'graph_ready': return 'Constructing graph';
      default: return `Processing (${status.replace('_', ' ')})`;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      <Loader size={48} color="#4CAF50" className="spin-animation" style={{ animation: 'spin 2s linear infinite' }} />
      <style>
        {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>
      <h2 style={{ color: 'white', fontWeight: 500 }}>
        {getStatusText()}<span>{dots}</span>
      </h2>
      <p style={{ color: '#888', maxWidth: '400px', textAlign: 'center', lineHeight: 1.5 }}>
        This process runs autonomously on our background workers. 
        Maneuvering heavy repositories may take a minute or two.
      </p>
    </div>
  );
}
