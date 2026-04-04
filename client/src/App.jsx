import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore.js';
import LoginPage from './pages/LoginPage.jsx';
import OAuthCallbackPage from './pages/OAuthCallbackPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

export default function App() {
  const { fetchMe, isAuthenticated } = useAuthStore();

  // Re-hydrate the user on mount (handles page refresh)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !isAuthenticated) {
      fetchMe();
    }
  }, [fetchMe, isAuthenticated]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/repo/:repoId"
        element={
          <ProtectedRoute>
            {/* RepoPage will be implemented in the next feature iteration */}
            <div style={{ color: 'white', padding: '2rem' }}>Repo Analyser (coming soon)</div>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
