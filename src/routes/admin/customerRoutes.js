import express from 'express';
const router = express.Router();
import { getCustomers,
  getCustomerById,
  toggleCustomerStatus, } from '../../controllers/admin/customerController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.patch('/:id/toggle-status', toggleCustomerStatus);

export default router;
