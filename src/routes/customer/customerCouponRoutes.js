const express = require('express');
const router = express.Router();
const { validateCoupon } = require('../../controllers/customer/customerCouponController');

router.post('/validate', validateCoupon);

module.exports = router;
