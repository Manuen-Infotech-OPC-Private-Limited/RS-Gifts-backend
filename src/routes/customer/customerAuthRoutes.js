import express from 'express';
const router = express.Router();
import { registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  deleteCustomerAddress, } from '../../controllers/customer/customerAuthController.js';
import { protect } from '../../middlewares/authMiddleware.js';

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);

// Authenticated customer profile & address routes
router.use(protect);
router.route('/profile')
  .get(getCustomerProfile)
  .put(updateCustomerProfile);

router.post('/addresses', addCustomerAddress);
router.delete('/addresses/:addressId', deleteCustomerAddress);

export default router;
