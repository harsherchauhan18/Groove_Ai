import React, { useState } from 'react';
import useCodebaseStore from '../../store/useCodebaseStore.js';
import { Github } from 'lucide-react';

export default function RepoInput() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { fetchRepositories, setActiveRepoId } = useCodebaseStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/repos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ repo_url: url })
      });

      if (!res.ok) {
        throw new Error('Failed to analyze repository');
      }

      const data = await res.json();
      setUrl('');
      await fetchRepositories();
      setActiveRepoId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#111', padding: '1.5rem', borderRadius: '12px', border: '1px solid #333' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
        <Github size={20} /> Analyze New Repository
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
          style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #444', background: '#000', color: 'white' }}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: '#4CAF50', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Submitting...' : 'Analyze Repo'}
        </button>
      </form>
      {error && <p style={{ color: '#ff4444', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}
