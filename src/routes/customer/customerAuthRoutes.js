import express from 'express';
const router = express.Router();
import {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  updateCustomerAddress,
  setDefaultCustomerAddress,
  deleteCustomerAddress,
  logoutCustomer,
  logoutAllCustomerSessions,
  getCustomerSessions,
  revokeCustomerSession,
} from '../../controllers/customer/customerAuthController.js';
import { protect } from '../../middlewares/authMiddleware.js';
import { customerLoginLimiter, registerLimiter } from '../../middlewares/rateLimitMiddleware.js';

router.post('/register', registerLimiter, registerCustomer);
router.post('/login', customerLoginLimiter, loginCustomer);

// Authenticated customer profile, address & session routes
router.use(protect);
router.route('/profile')
  .get(getCustomerProfile)
  .put(updateCustomerProfile);

router.post('/addresses', addCustomerAddress);
router.put('/addresses/:addressId', updateCustomerAddress);
router.put('/addresses/:addressId/default', setDefaultCustomerAddress);
router.delete('/addresses/:addressId', deleteCustomerAddress);

// Server-side Session Management & Logout
router.post('/logout', logoutCustomer);
router.post('/logout-all', logoutAllCustomerSessions);
router.get('/sessions', getCustomerSessions);
router.delete('/sessions/:sessionId', revokeCustomerSession);

export default router;
