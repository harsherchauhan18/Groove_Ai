import React from 'react';
import useCodebaseStore from '../../store/useCodebaseStore.js';
import { CheckCircle2, Clock, Box } from 'lucide-react';

export default function RepoList() {
  const { repoList, repoStatusMap, setActiveRepoId } = useCodebaseStore();

  if (!repoList || repoList.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666', border: '1px dashed #333', borderRadius: '12px' }}>
        <Box size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p>No repositories analyzed yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
      {repoList.map(repo => {
        const currentStatus = repoStatusMap[repo.id] || repo.status;
        const isCompleted = currentStatus === 'completed';

        return (
          <div 
            key={repo.id}
            onClick={() => setActiveRepoId(repo.id)}
            style={{ 
              background: '#111', 
              border: '1px solid #333', 
              padding: '1.5rem', 
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              ':hover': { transform: 'translateY(-2px)' }
            }}
          >
            <h4 style={{ margin: '0 0 1rem 0', wordBreak: 'break-all' }}>{repo.url.split('/').pop()}</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#888' }}>{repo.url}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: isCompleted ? '#4CAF50' : '#FF9800' }}>
              {isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              <span style={{ textTransform: 'capitalize' }}>{currentStatus}</span>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#555' }}>
              Added: {new Date(repo.createdAt).toLocaleDateString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
