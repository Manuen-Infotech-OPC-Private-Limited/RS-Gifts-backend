import express from 'express';
const router = express.Router();
import { registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  deleteCustomerAddress, } from '../../controllers/customer/customerAuthController.js';
import { protect } from '../../middlewares/authMiddleware.js';
import { customerLoginLimiter, registerLimiter } from '../../middlewares/rateLimitMiddleware.js';

router.post('/register', registerLimiter, registerCustomer);
router.post('/login', customerLoginLimiter, loginCustomer);

// Authenticated customer profile & address routes
router.use(protect);
router.route('/profile')
  .get(getCustomerProfile)
  .put(updateCustomerProfile);

router.post('/addresses', addCustomerAddress);
router.delete('/addresses/:addressId', deleteCustomerAddress);

export default router;
