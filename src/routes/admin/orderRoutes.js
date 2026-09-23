const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
} = require('../../controllers/admin/orderController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/payment-status', updatePaymentStatus);

module.exports = router;
