import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Code, BarChart3, Settings, LogOut, ArrowLeft } from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';
import useCodebaseStore from '../store/useCodebaseStore.js';
import RepoInput from '../components/codebase/RepoInput.jsx';
import RepoList from '../components/codebase/RepoList.jsx';
import ProgressIndicator from '../components/codebase/ProgressIndicator.jsx';
import RepoGraphViewer from '../components/graph/RepoGraphViewer.jsx';
import CodeViewer from '../components/editor/CodeViewer.jsx';
import FileExplorer from '../components/codebase/FileExplorer.jsx';
import '../styles/Dashboard.css';

export default function CodebasePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { activeRepoId, setActiveRepoId, fetchRepositories, repoStatusMap, fetchTree } = useCodebaseStore();

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  useEffect(() => {
    if (activeRepoId && repoStatusMap[activeRepoId] === 'completed') {
      fetchTree(activeRepoId);
    }
  }, [activeRepoId, repoStatusMap, fetchTree]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isRepoActiveAndReady = activeRepoId && repoStatusMap[activeRepoId] === 'completed';
  const isRepoActiveAndProcessing = activeRepoId && repoStatusMap[activeRepoId] !== 'completed' && repoStatusMap[activeRepoId] !== 'failed';

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo-section">
          <span className="logo-text">groove-ai</span>
        </div>
        <nav className="nav-menu">
          <div className="nav-item" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard /> Dashboard
          </div>
          <div className="nav-item active">
            <Code /> Codebase
          </div>
          <div className="nav-item">
            <BarChart3 /> Insights
          </div>
          <div className="nav-item">
            <Settings /> Settings
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
             <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ padding: activeRepoId ? '0' : 'var(--space-8)', maxWidth: activeRepoId ? 'none' : '1200px' }}>
        {!activeRepoId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="header-section">
              <h1 className="welcome-text">Codebase Hub</h1>
              <p className="subtitle-text">Manage and explore your analyzed repositories with AI assistance.</p>
            </div>
            <RepoInput />
            <div style={{ marginTop: 'var(--space-8)' }}>
              <RepoList />
            </div>
          </motion.div>
        )}

        {isRepoActiveAndProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="glass-card p-12 max-w-lg w-full space-y-6 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                 <div className="h-full bg-brand-primary animate-progress-indefinite" style={{ width: '40%' }}></div>
               </div>
               
               <button 
                 onClick={() => setActiveRepoId(null)} 
                 className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
               >
                 <ArrowLeft size={16} />
               </button>
               
               <div className="space-y-4">
                 <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                    <Code size={32} />
                 </div>
                 <h2 className="text-2xl font-bold tracking-tight text-white capitalize">
                   {repoStatusMap[activeRepoId]}...
                 </h2>
                 <p className="text-gray-400 text-sm leading-relaxed">
                   {repoStatusMap[activeRepoId] === 'parsing' 
                     ? "Intelligently deconstructing your codebase chunks. Large projects might take a moment."
                     : repoStatusMap[activeRepoId] === 'analyzing'
                     ? "Building semantic graphs and mapping relationships. We're getting closer."
                     : "Establishing connection and pulling repository data."}
                 </p>
               </div>
               
               <div className="pt-4">
                 <ProgressIndicator repoId={activeRepoId} />
               </div>
            </div>
          </motion.div>
        )}

        {isRepoActiveAndReady && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="codebase-explorer-container"
          >
             {/* Left: Explorer Panel */}
             <aside className="explorer-panel" style={{ width: '300px' }}>
               <div className="panel-header">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveRepoId(null)} 
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <span className="font-bold text-sm tracking-tight">Explorer</span>
                  </div>
                  <div className="status-ready-pill">Live</div>
               </div>
               <div className="panel-content scrollbar-custom">
                 <FileExplorer />
               </div>
             </aside>

             {/* Center: Graph Panel */}
             <section className="explorer-panel" style={{ flex: 1.2 }}>
               <div className="panel-header">
                 <h3 className="panel-title">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   Dependency Map
                 </h3>
               </div>
               <div className="panel-content">
                 <RepoGraphViewer repoId={activeRepoId} />
               </div>
             </section>

             {/* Right: Code Editor Panel */}
             <section className="explorer-panel" style={{ flex: 1.8, borderRight: 'none' }}>
               <div className="panel-header" style={{ background: 'rgba(0,0,0,0.2)' }}>
                 <h3 className="panel-title">Source View</h3>
                 {activeRepoId && (
                    <span className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase">
                      ID: {activeRepoId.slice(0, 8)}
                    </span>
                 )}
               </div>
               <div className="panel-content bg-[#050505]">
                 <CodeViewer repoId={activeRepoId} />
               </div>
             </section>
          </motion.div>
        )}
      </main>
    </div>
  );
}
