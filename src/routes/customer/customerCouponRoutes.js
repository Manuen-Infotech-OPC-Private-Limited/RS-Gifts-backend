import express from 'express';
const router = express.Router();
import { validateCoupon, getActiveCoupons } from '../../controllers/customer/customerCouponController.js';

router.get('/', getActiveCoupons);
router.get('/active', getActiveCoupons);
router.post('/validate', validateCoupon);

export default router;
