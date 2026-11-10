import rateLimit from 'express-rate-limit';

// Strict rate limiter for Admin Login to prevent brute force credential stuffing
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 attempts per IP per 15 minutes
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable legacy X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many admin login attempts from this IP address. Please try again after 15 minutes.',
  },
});

// Rate limiter for Customer Login to prevent credential guessing
export const customerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 15, // Max 15 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.',
  },
});

// Rate limiter for Customer Account Registration to prevent spam account creation
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Max 10 accounts created per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts registered from this IP address. Please try again after an hour.',
  },
});

// Rate limiter for File Uploads to prevent DoS / storage abuse
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Max 30 file uploads per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many file uploads from this IP address. Please try again later.',
  },
});
