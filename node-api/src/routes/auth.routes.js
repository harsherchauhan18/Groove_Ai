import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  googleCallback,
  refreshToken,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Email / Password ──────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);

// ── Google OAuth 2.0 ─────────────────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  googleCallback
);

export default router;
