import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, MessageSquare, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../components/common/Sidebar.jsx';
import ChatInterface from '../components/chat/ChatInterface.jsx';
import '../styles/Chat.css';

/**
 * Dedicated AI Chat page for a specific repository.
 * Provides a persistent conversation interface powered by Groove AI.
 */
export default function ChatPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!repoId) navigate('/dashboard', { replace: true });
  }, [repoId, navigate]);

  if (!repoId) return null;

  return (
    <div className="dashboard-container" style={{ display: 'flex', background: '#060914', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <header style={{
          padding: '1.25rem 2rem',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              style={{
                width: 42, height: 42, borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Bot size={20} color="#fff" />
            </motion.div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f1f5f9' }}>
                AI <span style={{ color: '#818cf8' }}>Repository</span> Assistant
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                Repository: <span style={{ color: '#94a3b8', fontWeight: '600' }}>{repoId}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px' }}>
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}
            />
            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '600' }}>Memory Active</span>
            <Sparkles size={12} color="#10b981" />
          </div>
        </header>

        {/* Chat Interface */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '0' }}>
          <ChatInterface repoId={repoId} />
        </div>

      </main>
    </div>
  );
}
