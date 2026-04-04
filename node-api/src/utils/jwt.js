import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Signs an access token (short-lived).
 */
export const signAccessToken = (payload) =>
  jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });

/**
 * Signs a refresh token (long-lived).
 */
export const signRefreshToken = (payload) =>
  jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
  });

/**
 * Verifies an access token. Throws if invalid/expired.
 */
export const verifyAccessToken = (token) =>
  jwt.verify(token, ENV.JWT_SECRET);

/**
 * Verifies a refresh token. Throws if invalid/expired.
 */
export const verifyRefreshToken = (token) =>
  jwt.verify(token, ENV.JWT_REFRESH_SECRET);

/**
 * Builds the standard token pair response object.
 */
export const buildTokenPair = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};
