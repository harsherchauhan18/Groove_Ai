import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Github, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Code,
  FileCode,
  BarChart3,
  X
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import { repositoryService } from '../services/repositoryService.js';
import '../styles/Dashboard.css';
import ChatInterface from '../components/chat/ChatInterface.jsx';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isLoading: isAuthLoading } = useAuthStore();
  const [repoUrl, setRepoUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRepoId, setSelectedRepoId] = useState(null);

  useEffect(() => {
    fetchRepositories();
    // Poll every 10s if any repo is not completed or failed
    const interval = setInterval(() => {
      const hasActive = repositories.some(r => !['completed', 'failed'].includes(r.status));
      if (hasActive) fetchRepositories();
    }, 10000);
    return () => clearInterval(interval);
  }, [repositories]);

  const fetchRepositories = async () => {
    try {
      const data = await repositoryService.getRepositories();
      setRepositories(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
      setRepositories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;
    
    setIsIngesting(true);
    setError(null);
    try {
      await repositoryService.ingest(repoUrl);
      setRepoUrl('');
      fetchRepositories();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start analysis');
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <span className="logo-text">groove-ai</span>
        </div>

        <nav className="nav-menu">
          <div className="nav-item active">
            <LayoutDashboard size={20} />
            Dashboard
          </div>
          <div className="nav-item">
            <Code size={20} />
            Projects
          </div>
          <div className="nav-item">
            <BarChart3 size={20} />
            Insights
          </div>
          <div className="nav-item">
            <Settings size={20} />
            Settings
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="user-avatar" />
            ) : (
              <div className="user-avatar" style={{ background: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="user-info">
              <span className="user-name">{user?.name || 'Developer'}</span>
              <span className="user-email">{user?.email || 'dev@groove.ai'}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} disabled={isLoading}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header-section">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="welcome-text"
          >
            Hello, {user?.name?.split(' ')[0] || 'Developer'}!
          </motion.h1>
          <p className="subtitle-text">Welcome to your code intelligence hub.</p>
        </header>

        {/* Stats */}
        <div className="stats-container">
          <StatBox label="Total Projects" value={repositories.length} />
          <StatBox label="Total Files" value="-" />
          <StatBox label="Avg. Score" value="92%" />
          <StatBox label="Uptime" value="99.9%" />
        </div>

        {/* Ingest Repository */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ingest-card"
        >
          <div className="ingest-title">
            <Github size={20} />
            Analyze New Repository
          </div>
          <form className="ingest-form" onSubmit={handleIngest}>
            <input 
              type="text" 
              placeholder="https://github.com/username/repository" 
              className="ingest-input"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isIngesting}
            />
            <button className="ingest-btn" type="submit" disabled={isIngesting}>
              {isIngesting ? 'Analyzing...' : 'Start Analysis'}
            </button>
          </form>
          {error && <p className="error-text" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>}
        </motion.div>

        {/* Repository Grid */}
        <div className="repo-grid">
          {repositories.length === 0 ? (
            <div className="empty-repos">
              <Code size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>No repositories analyzed yet. Add one above to get started!</p>
            </div>
          ) : (
            repositories.map((repo, index) => (
              <motion.div 
                key={repo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="repo-card"
                onClick={() => repo.status === 'completed' && setSelectedRepoId(repo.id)}
                style={{ cursor: repo.status === 'completed' ? 'pointer' : 'default' }}
              >
                <div className="repo-header">
                  <div>
                    <h3 className="repo-name">{repo.name || repo.url.split('/').pop()}</h3>
                    <div className="repo-meta">
                      <span className="repo-meta-item">
                        <FileCode size={14} />
                        {repo.files || 0} files
                      </span>
                      <span className="repo-meta-item">
                        <Clock size={14} />
                        {new Date(repo.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={repo.status} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                      <div 
                        style={{ 
                          width: `${repo.status === 'completed' ? 100 : (repo.status === 'parsing' ? 40 : 10)}%`, 
                          height: '100%', 
                          background: 'var(--color-brand-primary)', 
                          borderRadius: '2px' 
                        }} 
                      />
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Chat Modal Overlay */}
      <AnimatePresence>
        {selectedRepoId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="chat-overlay"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="chat-modal-content"
            >
              <button className="close-chat" onClick={() => setSelectedRepoId(null)}>
                <X size={24} />
              </button>
              <ChatInterface repoId={selectedRepoId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    completed: { icon: CheckCircle2, class: 'status-completed', text: 'Completed' },
    cloning: { icon: Clock, class: 'status-processing', text: 'Cloning' },
    parsing: { icon: Clock, class: 'status-processing', text: 'Parsing' },
    analyzing: { icon: Clock, class: 'status-processing', text: 'Analyzing' },
    failed: { icon: AlertCircle, class: 'status-failed', text: 'Failed' },
    pending: { icon: Clock, class: 'status-processing', text: 'Pending' }
  };
  
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  
  return (
    <span className={`status-badge ${config.class}`}>
      <Icon size={12} style={{ marginRight: '4px' }} />
      {config.text}
    </span>
  );
}
