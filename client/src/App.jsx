import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore.js';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import OAuthCallbackPage from './pages/OAuthCallbackPage.jsx';
import RepositoriesPage from './pages/RepositoriesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import GraphIntelligencePage from './pages/GraphIntelligencePage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import RepoPage from './pages/RepoPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import FolderExplorerPage from './pages/FolderExplorerPage.jsx';
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
      {/* ── Public ──────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

      {/* ── Protected ───────────────────────────────────────── */}

      {/* Home: Repositories list */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RepositoriesPage />
          </ProtectedRoute>
        }
      />

      {/* Graph Intelligence — full bi-directional sync */}
      <Route
        path="/graph/:repoId"
        element={
          <ProtectedRoute>
            <GraphIntelligencePage />
          </ProtectedRoute>
        }
      />

      {/* Graph Intelligence (legacy route) */}
      <Route
        path="/dashboard/sync/:repoId"
        element={
          <ProtectedRoute>
            <GraphIntelligencePage />
          </ProtectedRoute>
        }
      />

      {/* Codebase Navigator */}
      <Route
        path="/repo/:repoId"
        element={
          <ProtectedRoute>
            <RepoPage />
          </ProtectedRoute>
        }
      />

      {/* Deep Insights */}
      <Route
        path="/insights/:repoId"
        element={
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        }
      />

      {/* Folder Structure Explorer */}
      <Route
        path="/explorer/:repoId"
        element={
          <ProtectedRoute>
            <FolderExplorerPage />
          </ProtectedRoute>
        }
      />

      {/* AI Chat */}
      <Route
        path="/chat/:repoId"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      {/* ── Fallback ────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
