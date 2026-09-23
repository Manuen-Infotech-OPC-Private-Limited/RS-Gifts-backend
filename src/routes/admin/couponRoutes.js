const express = require('express');
const router = express.Router();
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
} = require('../../controllers/admin/couponController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.route('/:id')
  .put(updateCoupon)
  .delete(deleteCoupon);

router.patch('/:id/toggle-active', toggleCouponActive);

module.exports = router;
