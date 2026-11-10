import express from 'express';
const router = express.Router();
import { loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  registerInitialAdmin, } from '../../controllers/admin/authController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';
import { adminLoginLimiter } from '../../middlewares/rateLimitMiddleware.js';

router.post('/login', adminLoginLimiter, loginAdmin);
router.post('/register-initial', registerInitialAdmin);
router.get('/profile', protect, adminOnly, getAdminProfile);
router.put('/profile', protect, adminOnly, updateAdminProfile);

export default router;
