const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  deleteCustomerAddress,
} = require('../../controllers/customer/customerAuthController');
const { protect } = require('../../middlewares/authMiddleware');

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);

// Authenticated customer profile & address routes
router.use(protect);
router.route('/profile')
  .get(getCustomerProfile)
  .put(updateCustomerProfile);

router.post('/addresses', addCustomerAddress);
router.delete('/addresses/:addressId', deleteCustomerAddress);

module.exports = router;
