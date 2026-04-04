import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import './config/passport.js'; // register strategies

import authRoutes from './routes/auth.routes.js';
import './models/index.js'; // Ensure models are registered

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: ENV.RATE_LIMIT_WINDOW_MS,
    max: ENV.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
  })
);

// ── Body / Cookie parsing ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(ENV.COOKIE_SECRET));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(ENV.PORT, () => {
    console.log(`🚀 Node API running on http://localhost:${ENV.PORT}`);
  });
};

start();

export default app;
