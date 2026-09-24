import express from 'express';
const router = express.Router();
import { createCustomerOrder,
  getMyOrders,
  getCustomerOrderDetails,
  cancelCustomerOrder, } from '../../controllers/customer/customerOrderController.js';
import { protect, optionalAuth } from '../../middlewares/authMiddleware.js';

router.post('/', optionalAuth, createCustomerOrder);
router.get('/my', protect, getMyOrders);
router.get('/:idOrNumber', optionalAuth, getCustomerOrderDetails);
router.post('/:id/cancel', optionalAuth, cancelCustomerOrder);

export default router;
