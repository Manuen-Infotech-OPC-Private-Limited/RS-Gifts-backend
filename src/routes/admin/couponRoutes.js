import express from 'express';
const router = express.Router();
import { getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive, } from '../../controllers/admin/couponController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.route('/:id')
  .put(updateCoupon)
  .delete(deleteCoupon);

router.patch('/:id/toggle-active', toggleCouponActive);

export default router;
