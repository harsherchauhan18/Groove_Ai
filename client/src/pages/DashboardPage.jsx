import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {/* Gradient logo */}
      <div
        style={{
          fontSize: '3rem',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 800,
          letterSpacing: '-0.03em',
        }}
      >
        groove-ai
      </div>

      <p
        style={{
          color: 'var(--color-text-secondary)',
          maxWidth: 420,
          fontSize: '1rem',
          lineHeight: 1.7,
        }}
      >
        Welcome back,{' '}
        <strong style={{ color: 'var(--color-text-accent)' }}>
          {user?.name ?? 'Developer'}
        </strong>
        ! Your dashboard is under construction — paste a GitHub URL to start
        analysing your codebase.
      </p>

      {user?.avatar && (
        <img
          src={user.avatar}
          alt="Avatar"
          style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #6366f1' }}
        />
      )}

      <button
        onClick={handleLogout}
        disabled={isLoading}
        style={{
          padding: '0.625rem 1.75rem',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none',
          borderRadius: '10px',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: 'pointer',
          opacity: isLoading ? 0.6 : 1,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {isLoading ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
}
