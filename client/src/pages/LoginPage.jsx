import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore.js';
import { authService } from '../services/authService.js';
import '../styles/LoginPage.css';

// ── Icon components (inline SVG — no extra dependency) ────────
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const GoogleSVG = () => (
  <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ── Features list for hero panel ──────────────────────────────
const FEATURES = [
  {
    icon: '🔍',
    title: 'Semantic Code Search',
    desc: 'Find code by intent, not just keywords',
  },
  {
    icon: '🕸️',
    title: 'Dependency Graphs',
    desc: 'Visualise file & function relationships',
  },
  {
    icon: '🤖',
    title: 'AI Explanations',
    desc: 'Instant RAG-powered code explanations',
  },
  {
    icon: '⚡',
    title: 'Execution Flow',
    desc: 'Trace API to DB call chains visually',
  },
];

// ── Main Component ────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  // Handle OAuth callback token in URL params
  useEffect(() => {
    const token = searchParams.get('token');
    const oauthError = searchParams.get('error');

    if (token) {
      localStorage.setItem('accessToken', token);
      // fetchMe will update the store
      useAuthStore.getState().fetchMe().then(() => {
        navigate('/dashboard', { replace: true });
      });
    }

    if (oauthError === 'oauth_failed') {
      useAuthStore.setState({ error: 'Google sign-in failed. Please try again.' });
    }
  }, [searchParams, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when switching tabs
  const handleTabSwitch = (t) => {
    setTab(t);
    clearError();
    setFieldErrors({});
    setSuccessMsg('');
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    clearError();
  };

  // ── Client-side validation ───────────────────────────────────
  const validate = () => {
    const errs = {};
    if (tab === 'signup' && !form.name.trim()) {
      errs.name = 'Full name is required.';
    }
    if (!form.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!form.password) {
      errs.password = 'Password is required.';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    if (tab === 'signup') {
      if (!form.confirmPassword) {
        errs.confirmPassword = 'Please confirm your password.';
      } else if (form.password !== form.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    if (tab === 'login') {
      const result = await login({ email: form.email, password: form.password });
      if (result.success) {
        navigate('/dashboard', { replace: true });
      }
    } else {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      if (result.success) {
        navigate('/dashboard', { replace: true });
      }
    }
  };

  return (
    <div className="auth-root" role="main">
      {/* Animated background blobs */}
      <div className="auth-bg-blob auth-bg-blob--1" aria-hidden="true" />
      <div className="auth-bg-blob auth-bg-blob--2" aria-hidden="true" />
      <div className="auth-bg-blob auth-bg-blob--3" aria-hidden="true" />

      {/* ── Left hero panel ──────────────────────────────────── */}
      <section className="auth-hero" aria-label="Product overview">
        <div className="auth-hero__logo">
          <div className="auth-hero__logo-icon" aria-hidden="true">⚡</div>
          <span className="auth-hero__logo-text">groove-ai</span>
        </div>

        <span className="auth-hero__badge">
          <span className="auth-hero__badge-dot" />
          AI-Powered Repo Analysis
        </span>

        <h1 className="auth-hero__title">
          Understand any{' '}
          <span className="auth-hero__title-gradient">codebase</span>{' '}
          in minutes
        </h1>

        <p className="auth-hero__subtitle">
          groove-ai ingests your GitHub repository and gives you interactive dependency
          graphs, semantic search, AI-powered explanations, and execution flow
          visualisation — all in one place.
        </p>

        <div className="auth-hero__features" role="list">
          {FEATURES.map((f) => (
            <div className="auth-hero__feature" key={f.title} role="listitem">
              <div className="auth-hero__feature-icon" aria-hidden="true">{f.icon}</div>
              <div className="auth-hero__feature-text">
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Right auth card ───────────────────────────────────── */}
      <div className="auth-panel">
        <div className="auth-card" role="region" aria-label="Authentication form">
          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist">
            <button
              id="tab-login"
              role="tab"
              aria-selected={tab === 'login'}
              className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
              onClick={() => handleTabSwitch('login')}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              role="tab"
              aria-selected={tab === 'signup'}
              className={`auth-tab ${tab === 'signup' ? 'auth-tab--active' : ''}`}
              onClick={() => handleTabSwitch('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Heading */}
          <h2 className="auth-card__heading">
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="auth-card__subheading">
            {tab === 'login'
              ? 'Sign in to continue to groove-ai.'
              : 'Join groove-ai and start analysing repos with AI.'}
          </p>

          {/* Error / success alert */}
          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <IconAlert />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="auth-alert auth-alert--success" role="status">
              <span>✓ {successMsg}</span>
            </div>
          )}

          {/* Google OAuth */}
          <button
            id="btn-google-auth"
            className="auth-google-btn"
            onClick={authService.loginWithGoogle}
            disabled={isLoading}
            aria-label="Continue with Google"
          >
            <GoogleSVG />
            Continue with Google
          </button>

          <div className="auth-divider" aria-hidden="true">or</div>

          {/* Email / Password Form */}
          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby={`tab-${tab}`}
          >
            {/* Name — signup only */}
            {tab === 'signup' && (
              <div className="auth-field">
                <label htmlFor="auth-name" className="auth-label">Full Name</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true"><IconUser /></span>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    className={`auth-input ${fieldErrors.name ? 'auth-input--error' : ''}`}
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'err-name' : undefined}
                  />
                </div>
                {fieldErrors.name && (
                  <span id="err-name" className="auth-error-msg" role="alert">
                    <IconAlert /> {fieldErrors.name}
                  </span>
                )}
              </div>
            )}

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="auth-email" className="auth-label">Email Address</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true"><IconMail /></span>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`auth-input ${fieldErrors.email ? 'auth-input--error' : ''}`}
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'err-email' : undefined}
                />
              </div>
              {fieldErrors.email && (
                <span id="err-email" className="auth-error-msg" role="alert">
                  <IconAlert /> {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="auth-password" className="auth-label">Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true"><IconLock /></span>
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  className={`auth-input ${fieldErrors.password ? 'auth-input--error' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'err-password' : undefined}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {fieldErrors.password && (
                <span id="err-password" className="auth-error-msg" role="alert">
                  <IconAlert /> {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Confirm Password — signup only */}
            {tab === 'signup' && (
              <div className="auth-field">
                <label htmlFor="auth-confirm-password" className="auth-label">
                  Confirm Password
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true"><IconLock /></span>
                  <input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`auth-input ${fieldErrors.confirmPassword ? 'auth-input--error' : ''}`}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={
                      fieldErrors.confirmPassword ? 'err-confirm-password' : undefined
                    }
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span
                    id="err-confirm-password"
                    className="auth-error-msg"
                    role="alert"
                  >
                    <IconAlert /> {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>
            )}

            {/* Forgot password link */}
            {tab === 'login' && (
              <div className="auth-actions">
                <button
                  type="button"
                  className="auth-link"
                  aria-label="Forgot password"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-auth-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading && <span className="auth-spinner" aria-hidden="true" />}
              {isLoading
                ? tab === 'login'
                  ? 'Signing in…'
                  : 'Creating account…'
                : tab === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          {/* Terms */}
          {tab === 'signup' && (
            <p className="auth-terms">
              By creating an account you agree to our{' '}
              <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
