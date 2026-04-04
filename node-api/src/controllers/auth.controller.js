import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import {
  buildTokenPair,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

const SALT_ROUNDS = 12;

// ── Register ───────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, password: hashed });

    const { accessToken, refreshToken } = buildTokenPair(user);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    res.cookie('refreshToken', refreshToken, cookieOptions());
    return res.status(201).json({
      message: 'Account created successfully.',
      accessToken,
      user: sanitize(user),
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ── Login ──────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const { accessToken, refreshToken } = buildTokenPair(user);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    res.cookie('refreshToken', refreshToken, cookieOptions());
    return res.status(200).json({
      message: 'Logged in successfully.',
      accessToken,
      user: sanitize(user),
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ── Google OAuth Callback ──────────────────────────────────────────────────────
export const googleCallback = async (req, res) => {
  try {
    const user = req.user; // populated by passport
    const { accessToken, refreshToken } = buildTokenPair(user);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    res.cookie('refreshToken', refreshToken, cookieOptions());
    // Redirect to frontend with access token
    const { CLIENT_URL } = (await import('../config/env.js')).ENV;
    return res.redirect(
      `${CLIENT_URL}/auth/callback?token=${encodeURIComponent(accessToken)}`
    );
  } catch (err) {
    console.error('[googleCallback]', err);
    return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

// ── Refresh Token ──────────────────────────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token provided.' });
    }

    const payload = verifyRefreshToken(token);
    const user = await User.findByPk(payload.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const newAccessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, cookieOptions());
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('[refreshToken]', err);
    return res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }
};

// ── Logout ─────────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const user = await User.findOne({ where: { refreshToken: token } });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[logout]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ── Get Current User ───────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: sanitize(req.user) });
  } catch (err) {
    console.error('[getMe]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const sanitize = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});
