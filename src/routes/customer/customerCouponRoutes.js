import express from 'express';
const router = express.Router();
import { validateCoupon } from '../../controllers/customer/customerCouponController.js';

router.post('/validate', validateCoupon);

export default router;
