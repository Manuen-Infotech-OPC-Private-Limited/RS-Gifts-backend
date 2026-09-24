import express from 'express';
const router = express.Router();
import { getDashboardStats } from '../../controllers/admin/dashboardController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.get('/stats', protect, adminOnly, getDashboardStats);

export default router;
