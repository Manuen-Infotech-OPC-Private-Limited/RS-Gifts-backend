import express from 'express';
const router = express.Router();
import { getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus, } from '../../controllers/admin/orderController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/payment-status', updatePaymentStatus);

export default router;
