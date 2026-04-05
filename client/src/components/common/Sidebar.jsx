import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  Code, 
  BarChart3, 
  Compass,
  LogOut,
  Search,
  Bot,
  Loader2
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore.js';
import useNavigationStore from '../../store/useNavigationStore';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { repoId } = useParams();
  const { user, logout } = useAuthStore();
  
  const { 
    searchQuery, 
    setSearchQuery, 
    isSearching, 
    handleNavigate,
    clearNavigation 
  } = useNavigationStore();

  const menuItems = [
    { id: 'repositories', icon: Code, label: 'Repositories', path: '/dashboard' },
    { id: 'navigator', icon: Compass, label: 'Codebase Navigator', path: repoId ? `/repo/${repoId}` : '/dashboard' },
    { id: 'insights', icon: BarChart3, label: 'Deep Insights', path: repoId ? `/insights/${repoId}` : '/dashboard' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const onSearchKey = async (e) => {
    if (e.key === 'Enter' && searchQuery && repoId) {
      const result = await handleNavigate(repoId, searchQuery);
      if (result && !location.pathname.startsWith('/repo')) {
         navigate(`/repo/${repoId}`);
      }
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand Section */}
      <div className="logo-section">
        <span className="logo-text">groove-ai</span>
      </div>

      {/* Codebase Navigator Search (Shortcut) */}
      {repoId && (
        <div className="sidebar-search-container" style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Navigate to logic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={onSearchKey}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '0.75rem',
                padding: '10px 10px 10px 38px',
                color: '#f1f5f9',
                fontSize: '0.85rem'
              }}
            />
            {isSearching && <Loader2 size={14} className="spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />}
          </div>
        </div>
      )}

      {/* Main Nav Items */}
      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path.split('/:')[0]);
          return (
            <div 
              key={item.id} 
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              style={{ position: 'relative' }}
            >
              <Icon size={20} />
              {item.label}
              {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#6366f1', borderRadius: '0 10px 10px 0' }} />}
            </div>
          );
        })}
      </nav>

      {/* Profile / Logout */}
      <div className="sidebar-footer">
        <div className="user-profile" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="user-avatar" />
          ) : (
            <div className="user-avatar" style={{ background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="user-info">
            <span className="user-name">{user?.name || 'Developer'}</span>
            <span className="user-email">{user?.email || 'dev@groove.ai'}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} style={{ marginTop: '1rem', width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem' }}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
