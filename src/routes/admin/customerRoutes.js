const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  toggleCustomerStatus,
} = require('../../controllers/admin/customerController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.patch('/:id/toggle-status', toggleCustomerStatus);

module.exports = router;
