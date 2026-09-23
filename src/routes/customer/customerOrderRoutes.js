const express = require('express');
const router = express.Router();
const {
  createCustomerOrder,
  getMyOrders,
  getCustomerOrderDetails,
  cancelCustomerOrder,
} = require('../../controllers/customer/customerOrderController');
const { protect, optionalAuth } = require('../../middlewares/authMiddleware');

router.post('/', optionalAuth, createCustomerOrder);
router.get('/my', protect, getMyOrders);
router.get('/:idOrNumber', optionalAuth, getCustomerOrderDetails);
router.post('/:id/cancel', optionalAuth, cancelCustomerOrder);

module.exports = router;
