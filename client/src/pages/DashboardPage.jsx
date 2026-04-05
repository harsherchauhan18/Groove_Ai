import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { LayoutGrid, Share2, Code2, Database, GitBranch, Cpu } from 'lucide-react';

import Sidebar from '../components/common/Sidebar.jsx';
import RepoGraphViewer from '../components/graph/RepoGraphViewer.jsx';
import CodeViewer from '../components/editor/CodeViewer.jsx';
import useGraphSyncStore from '../store/useGraphSyncStore';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

/**
 * Main Graph Intelligence Dashboard.
 * Displays repository structural graph and Monaco editor in a synced view.
 * Accessible at /dashboard/sync/:repoId
 */
export default function DashboardPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const setFunctionMappings = useGraphSyncStore((state) => state.setFunctionMappings);
  
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [functionCount, setFunctionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    // If accessed at /dashboard (no repoId), redirect to repos list
    if (!repoId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const loadRepoIntelligence = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [funcRes, graphRes] = await Promise.allSettled([
          axios.get(`${FASTAPI_URL}/api/functions/${repoId}`, { headers }),
          axios.get(`${FASTAPI_URL}/api/graph/visualization/${repoId}`, { headers })
        ]);

        if (funcRes.status === 'fulfilled') {
          const mappings = funcRes.value.data;
          setFunctionMappings(Array.isArray(mappings) ? mappings : []);
          setFunctionCount(Array.isArray(mappings) ? mappings.length : 0);
        }

        if (graphRes.status === 'fulfilled') {
          const gd = graphRes.value.data;
          setGraphData({
            nodes: gd.nodes ?? [],
            edges: gd.edges ?? []
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard intelligence:', err);
        setError('Could not connect to the analysis engine. Ensure the FastAPI server is running.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadRepoIntelligence();
    }
  }, [repoId, token, setFunctionMappings, navigate]);

  return (
    <div className="dashboard-container" style={{ display: 'flex', background: '#020617', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Dynamic Header Section */}
        <header style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '1.25rem 2rem', 
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <Share2 size={20} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                Graph <span style={{ color: '#6366f1' }}>Intelligence</span>
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                {repoId ? `Analyzing: ${repoId}` : 'Select a repository to begin'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <StatBox icon={<Share2 size={16}/>} label="Graph Nodes" value={graphData.nodes.length} />
            <StatBox icon={<Cpu size={16}/>} label="Functions" value={functionCount} />
            <StatBox icon={<GitBranch size={16}/>} label="Edges" value={graphData.edges.length} />
          </div>
        </header>

        {/* Synchronized Core Viewport */}
        <div style={{ flex: 1, display: 'flex', gap: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                  <Code2 size={48} color="#6366f1" />
                </motion.div>
                <p style={{ marginTop: '1rem', color: '#94a3b8', fontWeight: '500' }}>Syncing Intelligence Engine...</p>
                <p style={{ marginTop: '0.5rem', color: '#475569', fontSize: '0.8rem' }}>Connecting to {FASTAPI_URL}</p>
              </div>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.5rem 2rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '1rem', maxWidth: '500px', textAlign: 'center' }}>
                <p style={{ color: '#f87171', fontWeight: '600', marginBottom: '0.5rem' }}>Connection Error</p>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{error}</p>
              </div>
              <p style={{ color: '#475569', fontSize: '0.8rem' }}>The graph will appear empty, but you can still view code below.</p>
            </div>
          ) : (
            <>
              {/* Left Column: Structural Graph Visualization */}
              <section style={{ flex: 1.2, borderRight: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(15,23,42,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Share2 size={12} color="#6366f1" /> Call Graph — Click any node to jump to its source
                </div>
                <div style={{ height: 'calc(100% - 37px)' }}>
                  <RepoGraphViewer nodes={graphData.nodes} edges={graphData.edges} />
                </div>
              </section>

              {/* Right Column: High-fidelity Source Preview with Monaco */}
              <section style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(15,23,42,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code2 size={12} color="#10b981" /> Code Viewer — Bi-directionally synced with graph
                </div>
                <div style={{ height: 'calc(100% - 37px)' }}>
                  <CodeViewer repoId={repoId} />
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Mini stat tracker component for header.
 */
function StatBox({ icon, label, value }) {
  return (
    <div style={{ padding: '8px 1.25rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ color: '#4b5563' }}>{icon}</div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '0.95rem' }}>{value}</div>
      </div>
    </div>
  );
}
