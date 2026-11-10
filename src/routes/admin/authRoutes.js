import express from 'express';
const router = express.Router();
import {
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  registerInitialAdmin,
  logoutAdmin,
  logoutAllAdminSessions,
  getAdminSessions,
  revokeAdminSession,
} from '../../controllers/admin/authController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';
import { adminLoginLimiter } from '../../middlewares/rateLimitMiddleware.js';

router.post('/login', adminLoginLimiter, loginAdmin);
router.post('/register-initial', registerInitialAdmin);

// Protected Admin Auth & Session Management Routes
router.use(protect, adminOnly);
router.route('/profile')
  .get(getAdminProfile)
  .put(updateAdminProfile);

router.post('/logout', logoutAdmin);
router.post('/logout-all', logoutAllAdminSessions);
router.get('/sessions', getAdminSessions);
router.delete('/sessions/:sessionId', revokeAdminSession);

export default router;
