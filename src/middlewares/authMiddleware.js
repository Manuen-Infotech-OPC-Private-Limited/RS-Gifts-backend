import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { createSession, invalidateAllUserSessions } from '../services/sessionService.js';

// Protect routes - Requires valid JWT backed by active Database Session
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'rs_gifts_default_jwt_secret_change_me'
      );

      // 1. Verify user existence & active status in DB
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists.',
        });
      }

      if (!user.isActive) {
        await invalidateAllUserSessions(user._id);
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.',
        });
      }

      // 2. Server-side Database Session Tracking Check
      let session = await Session.findOne({ token, user: user._id });

      if (session) {
        if (!session.isValid || session.expiresAt <= new Date()) {
          return res.status(401).json({
            success: false,
            message: 'Session has ended or been revoked. Please log in again.',
          });
        }
        // Throttled lastActive update (every 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!session.lastActive || session.lastActive < fiveMinutesAgo) {
          session.lastActive = new Date();
          await session.save({ validateBeforeSave: false });
        }
      } else {
        // Seamless migration: Auto-enroll existing valid unexpired JWT into database session tracking
        session = await createSession({
          userId: user._id,
          role: user.role,
          token,
          req,
          expiresInDays: 7,
        });
      }

      req.user = user;
      req.token = token;
      req.session = session;
      next();
    } catch (error) {
      console.error('Auth verification error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No authentication token provided.',
    });
  }
};

// Admin only restriction
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
    });
  }
};

// Customer only restriction
const customerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'customer') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Customer account required.',
    });
  }
};

// Optional authentication (for public routes that can personalize for logged-in users)
const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'rs_gifts_default_jwt_secret_change_me'
      );
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        const session = await Session.findOne({ token, user: user._id });
        if (!session || (session.isValid && session.expiresAt > new Date())) {
          req.user = user;
          req.token = token;
          req.session = session;
        } else {
          req.user = null;
        }
      } else {
        req.user = null;
      }
    } catch (e) {
      req.user = null;
    }
  }
  next();
};

export {
  protect,
  adminOnly,
  customerOnly,
  optionalAuth,
};

