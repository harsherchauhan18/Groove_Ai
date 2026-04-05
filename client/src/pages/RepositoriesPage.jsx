import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Cpu,
  Code2,
  ArrowRight,
  RefreshCw,
  Zap,
  FolderTree,
  BarChart3,
  Network,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { repositoryService } from '../services/repositoryService.js';
import '../styles/Dashboard.css';

const STATUS_CONFIG = {
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2, label: 'Ready' },
  processing: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: Loader2, label: 'Processing' },
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock, label: 'Pending' },
  failed: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: AlertCircle, label: 'Failed' },
};

function getStatusCfg(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

function RepoCard({ repo, onNavigate }) {
  const cfg = getStatusCfg(repo.status);
  const StatusIcon = cfg.icon;
  const isReady = repo.status === 'completed';
  const isProcessing = repo.status === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isReady ? { y: -4, scale: 1.01 } : {}}
      style={{
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        cursor: isReady ? 'pointer' : 'default',
        transition: 'all 0.25s',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
      }}
      onClick={() => isReady && onNavigate(repo.id || repo.repo_id)}
    >
      {/* Glow gradient on hover */}
      {isReady && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
          opacity: 0, transition: 'opacity 0.25s'
        }} className="card-glow-top" />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={18} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '1rem', lineHeight: 1.2 }}>
              {repo.name || repo.repo_url?.split('/').pop()?.replace('.git', '') || 'Repository'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px', fontFamily: 'monospace' }}>
              ID: {(repo.id || repo.repo_id || '').toString().substring(0, 8)}…
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: cfg.bg, borderRadius: '6px', border: `1px solid ${cfg.color}22` }}>
          <StatusIcon size={12} color={cfg.color} className={isProcessing ? 'spin' : ''} />
          <span style={{ color: cfg.color, fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
        </div>
      </div>

      {/* Repo URL */}
      {repo.repo_url && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <Globe size={13} color="#64748b" />
          <span style={{ color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {repo.repo_url}
          </span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: <Code2 size={12} />, label: repo.total_files ? `${repo.total_files} files` : 'Files pending' },
          { icon: <Cpu size={12} />, label: repo.language || 'Multi-lang' },
          { icon: <Clock size={12} />, label: repo.created_at ? new Date(repo.created_at).toLocaleDateString() : 'Recently added' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '0.75rem' }}>
            {item.icon} {item.label}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {isReady && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { icon: <Network size={13} />, label: 'Graph', path: 'sync' },
            { icon: <BarChart3 size={13} />, label: 'Insights', path: 'insights' },
            { icon: <FolderTree size={13} />, label: 'Explorer', path: 'explorer' },
            { icon: <Code2 size={13} />, label: 'Navigate', path: 'repo' },
          ].map((btn) => (
            <button
              key={btn.path}
              onClick={(e) => {
                e.stopPropagation();
                const repoId = repo.id || repo.repo_id;
                const paths = {
                  sync: `/dashboard/sync/${repoId}`,
                  insights: `/insights/${repoId}`,
                  explorer: `/explorer/${repoId}`,
                  repo: `/repo/${repoId}`,
                };
                onNavigate(repoId, paths[btn.path]);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '7px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#c7d2fe'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      )}

      {isProcessing && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, transparent, #6366f1, transparent)', borderRadius: '2px' }}
            />
          </div>
          <p style={{ color: '#6366f1', fontSize: '0.75rem', marginTop: '6px' }}>Parsing codebase... this may take a moment.</p>
        </div>
      )}
    </motion.div>
  );
}

export default function RepositoriesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState(null);

  const fetchRepos = async (isRetry = false) => {
    if (!isRetry) setLoading(true);
    setError(null);
    try {
      const data = await repositoryService.getRepositories();
      setRepos(Array.isArray(data) ? data : data.repositories ?? []);
      setRetrying(false);
    } catch (err) {
      const isNetworkError = !err.response && err.code !== 'ERR_CANCELED';
      if (isNetworkError && !isRetry) {
        // Auto-retry once after 3s if the server wasn't ready yet
        setRetrying(true);
        setError('Connecting to API server...');
        setTimeout(() => fetchRepos(true), 3000);
      } else {
        setRetrying(false);
        setError(
          err.response?.data?.detail ||
          'Cannot reach the FastAPI engine (localhost:8000). Make sure it is running.'
        );
      }
      console.error('[RepositoriesPage] fetchRepos error:', err.message);
    } finally {
      if (!isRetry) setLoading(false);
      else setLoading(false);
    }
  };

  useEffect(() => { fetchRepos(); }, []);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setIngesting(true);
    setIngestMsg(null);
    try {
      const result = await repositoryService.ingest(repoUrl.trim());
      setIngestMsg({ type: 'success', text: `Repository ingestion started! ID: ${result.repo_id || result.id}` });
      setRepoUrl('');
      setTimeout(fetchRepos, 2000);
    } catch (err) {
      setIngestMsg({ type: 'error', text: err.response?.data?.detail || 'Ingestion failed. Check the URL and try again.' });
    } finally {
      setIngesting(false);
    }
  };

  const handleNavigate = (repoId, path) => {
    navigate(path || `/repo/${repoId}`);
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', background: '#060914', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 3rem', background: '#060914' }}>

        {/* Welcome Header */}
        <header style={{ marginBottom: '3rem' }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem' }}>
              Welcome back, <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {user?.name?.split(' ')[0] || 'Developer'}
              </span> 👋
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
              Your AI-powered codebase intelligence workspace.
            </p>
          </motion.div>
        </header>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
          {[
            { icon: <GitBranch size={20} color="#6366f1" />, label: 'Total Repos', value: repos.length, color: '#6366f1' },
            { icon: <CheckCircle2 size={20} color="#10b981" />, label: 'Ready', value: repos.filter(r => r.status === 'completed').length, color: '#10b981' },
            { icon: <Loader2 size={20} color="#f59e0b" />, label: 'Processing', value: repos.filter(r => r.status === 'processing').length, color: '#f59e0b' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{ padding: '1.5rem', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1.25rem', backdropFilter: 'blur(10px)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ padding: '10px', background: `${stat.color}15`, borderRadius: '10px', border: `1px solid ${stat.color}25` }}>
                  {stat.icon}
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f8fafc', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Ingest Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="ingest-card"
          style={{ marginBottom: '3rem' }}
        >
          <div className="ingest-title">
            <Zap size={18} color="#6366f1" />
            <span>Ingest New Repository</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Paste a public GitHub URL to clone, parse, and embed your codebase into the intelligence engine.
          </p>
          <form className="ingest-form" onSubmit={handleIngest}>
            <input
              className="ingest-input"
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              disabled={ingesting}
              required
            />
            <button className="ingest-btn" type="submit" disabled={ingesting || !repoUrl.trim()}>
              {ingesting ? <><Loader2 size={15} className="spin" /> Ingesting...</> : <><Plus size={15} /> Add Repository</>}
            </button>
          </form>
          <AnimatePresence>
            {ingestMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: '1rem', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', background: ingestMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)', color: ingestMsg.type === 'success' ? '#34d399' : '#f87171', border: `1px solid ${ingestMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}` }}
              >
                {ingestMsg.text}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Repository Grid */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9' }}>
            Your Repositories
          </h2>
          <button
            onClick={fetchRepos}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748b' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <Loader2 size={32} color="#6366f1" />
            </motion.div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {retrying ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                  <RefreshCw size={18} color="#f59e0b" />
                </motion.div>
              ) : (
                <AlertCircle size={18} color="#f87171" />
              )}
              <span style={{ color: retrying ? '#f59e0b' : '#f87171', fontWeight: '600', fontSize: '0.95rem' }}>
                {error}
              </span>
            </div>
            {!retrying && (
              <button
                onClick={() => fetchRepos()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
              >
                <RefreshCw size={13} /> Retry
              </button>
            )}
            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
              Ensure <code style={{ color: '#94a3b8' }}>uvicorn</code> is running on port 8000
            </p>
          </div>
        ) : repos.length === 0 ? (
          <div className="empty-repos">
            <GitBranch size={48} color="rgba(99,102,241,0.3)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#f1f5f9', fontWeight: '700', marginBottom: '0.5rem' }}>No repositories yet</h3>
            <p>Add a GitHub repository above to get started with AI-powered codebase analysis.</p>
          </div>
        ) : (
          <div className="repo-grid">
            {repos.map((repo, i) => (
              <RepoCard key={repo.id || repo.repo_id || i} repo={repo} onNavigate={handleNavigate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
