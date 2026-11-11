import crypto from 'crypto';
import Session from '../models/Session.js';

// Cryptographically secure one-way hash for session tokens to avoid storing raw JWTs
export const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

// Parse user agent to extract clean device & browser description
const parseUserAgent = (uaString = '') => {
  if (!uaString) return 'Desktop Browser';
  const ua = uaString.toLowerCase();

  let browser = 'Browser';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/') && !ua.includes('edg/')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';
  else if (ua.includes('opera/') || ua.includes('opr/')) browser = 'Opera';

  let os = 'Unknown OS';
  if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('iphone')) os = 'iPhone';
  else if (ua.includes('ipad')) os = 'iPad';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';

  return `${browser} on ${os}`;
};

// Extract client IP address accurately (supporting proxy/Cloudflare)
const getClientIp = (req) => {
  if (!req) return '';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
};

// Create and register a new database session
export const createSession = async ({ userId, role, token, req, expiresInDays = 7 }) => {
  try {
    const userAgent = req?.headers ? req.headers['user-agent'] || '' : '';
    const ipAddress = getClientIp(req);
    const device = parseUserAgent(userAgent);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const tokenHash = hashToken(token);

    const session = await Session.create({
      user: userId,
      role: role || 'customer',
      tokenHash,
      device,
      ipAddress,
      userAgent,
      isValid: true,
      lastActive: new Date(),
      expiresAt,
    });

    return session;
  } catch (error) {
    console.error('Session creation error in DB:', error.message);
    return null;
  }
};

// Verify active session in MongoDB (Supports both hashed and legacy unhashed tokens)
export const verifySession = async ({ token, userId }) => {
  try {
    if (!token || !userId) return null;
    const tokenHash = hashToken(token);

    const session = await Session.findOne({
      $or: [{ tokenHash }, { token }],
      user: userId,
      isValid: true,
      expiresAt: { $gt: new Date() },
    });

    if (session) {
      // Auto-migrate legacy sessions to tokenHash
      if (!session.tokenHash) {
        session.tokenHash = tokenHash;
        session.token = undefined;
      }

      // Throttle lastActive updates (only update if lastActive is older than 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!session.lastActive || session.lastActive < fiveMinutesAgo) {
        session.lastActive = new Date();
        await session.save({ validateBeforeSave: false });
      }
    }

    return session;
  } catch (error) {
    console.error('Session verification DB error:', error.message);
    return null;
  }
};

// Invalidate single session (Single Device Logout)
export const invalidateSession = async (token) => {
  try {
    if (!token) return false;
    const tokenHash = hashToken(token);
    await Session.findOneAndUpdate(
      { $or: [{ tokenHash }, { token }] },
      { isValid: false, lastActive: new Date() }
    );
    return true;
  } catch (error) {
    console.error('Session invalidation DB error:', error.message);
    return false;
  }
};

// Invalidate all sessions for a user (Logout All Devices / Password Change / Deactivation)
export const invalidateAllUserSessions = async (userId, exceptToken = null) => {
  try {
    if (!userId) return false;
    const filter = { user: userId, isValid: true };
    if (exceptToken) {
      const exceptHash = hashToken(exceptToken);
      filter.tokenHash = { $ne: exceptHash };
      filter.token = { $ne: exceptToken };
    }

    await Session.updateMany(filter, {
      isValid: false,
      lastActive: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Invalidate all user sessions DB error:', error.message);
    return false;
  }
};

// Get list of active sessions for user account
export const getUserSessions = async (userId, currentToken = null) => {
  try {
    const currentHash = currentToken ? hashToken(currentToken) : null;
    const sessions = await Session.find({
      user: userId,
      isValid: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActive: -1 })
      .lean();

    return sessions.map((s) => ({
      id: s._id,
      _id: s._id,
      device: s.device,
      ipAddress: s.ipAddress ? s.ipAddress.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.***.***') : 'Unknown',
      lastActive: s.lastActive || s.updatedAt,
      createdAt: s.createdAt,
      isCurrent: currentHash ? (s.tokenHash === currentHash || s.token === currentToken) : false,
    }));
  } catch (error) {
    console.error('Get user sessions DB error:', error.message);
    return [];
  }
};

// Revoke a specific session by ID
export const revokeSessionById = async (userId, sessionId) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: sessionId, user: userId },
      { isValid: false, lastActive: new Date() }
    );
    return !!session;
  } catch (error) {
    console.error('Revoke session by ID DB error:', error.message);
    return false;
  }
};

