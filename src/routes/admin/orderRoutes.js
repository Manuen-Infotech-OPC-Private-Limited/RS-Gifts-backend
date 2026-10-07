import express from 'express';
const router = express.Router();
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderTracking,
  deleteOrder,
} from '../../controllers/admin/orderController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/tracking', updateOrderTracking);
router.patch('/:id/payment-status', updatePaymentStatus);
router.delete('/:id', deleteOrder);

export default router;
