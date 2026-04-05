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
    <div className="dashboard-container" style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: 'white' }}>
      <aside className="sidebar" style={{ width: '250px', borderRight: '1px solid #333', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        <div className="logo-section" style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
          groove-ai
        </div>
        <nav className="nav-menu" style={{ flex: 1, marginTop: '2rem' }}>
          <div className="nav-item" onClick={() => navigate('/dashboard')} style={{ padding: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className="nav-item active" style={{ padding: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: '#222', borderRadius: '8px' }}>
            <Code size={20} /> Codebase
          </div>
          <div className="nav-item" style={{ padding: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={20} /> Insights
          </div>
          <div className="nav-item" style={{ padding: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} /> Settings
          </div>
        </nav>
        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '1rem' }}>
           <button className="logout-btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'transparent', color: '#ff4444', border: 'none' }}>
             <LogOut size={16} /> Sign Out
           </button>
        </div>
      </aside>

      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {!activeRepoId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <h2>Codebase Hub</h2>
            <p style={{ color: '#aaa', marginBottom: '2rem' }}>Manage and explore your analyzed repositories.</p>
            <RepoInput />
            <br />
            <RepoList />
          </motion.div>
        )}

        {isRepoActiveAndProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <button 
              onClick={() => setActiveRepoId(null)} 
              className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} /> Back to dashboard
            </button>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-emerald-400 capitalize">
                {repoStatusMap[activeRepoId]}...
              </h2>
              <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
                {repoStatusMap[activeRepoId] === 'parsing' 
                  ? "We're breaking down your codebase into intelligent chunks. This might take a moment for larger projects."
                  : repoStatusMap[activeRepoId] === 'analyzing'
                  ? "Mapping dependencies and generating semantic graphs. Almost ready."
                  : "Connecting to the source and fetching repository data."}
              </p>
            </div>
            
            <ProgressIndicator repoId={activeRepoId} />
          </motion.div>
        )}

        {isRepoActiveAndReady && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-1 h-full overflow-hidden bg-[#0e0e0e]"
          >
             {/* Left: Enhanced File Explorer */}
             <div className="w-[280px] border-r border-[#1e1e1e] flex flex-col flex-shrink-0 bg-[#0d0d0d]">
               <div className="p-4 border-b border-[#1e1e1e] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveRepoId(null)} 
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-gray-400"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <span className="font-semibold text-sm tracking-wide">Files</span>
                  </div>
                  <div className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase">
                    Ready
                  </div>
               </div>
               <FileExplorer />
             </div>

             {/* Center: Graph */}
             <div className="flex-1 border-r border-[#1e1e1e] flex flex-col bg-[#0a0a0a]">
               <div className="p-4 border-b border-[#1e1e1e]">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                   Dependency Graph
                 </h3>
               </div>
               <div className="flex-1 relative">
                 <RepoGraphViewer repoId={activeRepoId} />
               </div>
             </div>

             {/* Right: Code */}
             <div className="flex-[1.5] flex flex-col">
               <div className="p-4 border-b border-[#1e1e1e] flex items-center justify-between bg-[#111]">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                   Source Code
                 </h3>
                 {activeRepoId && (
                    <span className="text-[10px] text-gray-600 font-mono italic">
                      Repo ID: {activeRepoId.slice(0, 8)}
                    </span>
                 )}
               </div>
               <div className="flex-1">
                 <CodeViewer repoId={activeRepoId} />
               </div>
             </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
