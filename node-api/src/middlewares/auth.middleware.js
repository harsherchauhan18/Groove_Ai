import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/user.model.js';

/**
 * Middleware: requires a valid Bearer access token.
 * Attaches the full user record to req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No access token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await User.findByPk(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired.' });
    }
    return res.status(401).json({ message: 'Invalid access token.' });
  }
};

/**
 * Middleware: restricts access to specific roles.
 * Must be used AFTER authenticate().
 */
export const authorize = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions.' });
    }
    return next();
  };
