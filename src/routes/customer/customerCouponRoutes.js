import express from 'express';
const router = express.Router();
import { validateCoupon, getActiveCoupons } from '../../controllers/customer/customerCouponController.js';
import { optionalAuth } from '../../middlewares/authMiddleware.js';

router.get('/', optionalAuth, getActiveCoupons);
router.get('/active', optionalAuth, getActiveCoupons);
router.post('/validate', optionalAuth, validateCoupon);

export default router;
