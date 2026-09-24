import Coupon from '../../models/Coupon.js';

// Calculate and validate coupon discount against subtotal
const validateCouponForAmount = (coupon, subtotal) => {
  if (!coupon.active) {
    return { valid: false, message: 'Coupon is currently inactive' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { valid: false, message: 'Coupon has expired' };
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'Coupon usage limit has been reached' };
  }

  if (subtotal < coupon.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
    };
  }

  let calculatedDiscount = 0;
  if (coupon.discountType === 'percentage') {
    calculatedDiscount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount > 0 && calculatedDiscount > coupon.maxDiscount) {
      calculatedDiscount = coupon.maxDiscount;
    }
  } else {
    calculatedDiscount = Math.min(coupon.discountValue, subtotal);
  }

  return {
    valid: true,
    discountAmount: Math.round(calculatedDiscount),
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  };
};

// @desc    Validate coupon code against cart subtotal
// @route   POST /api/customer/coupons/validate
// @access  Public
const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a coupon code',
      });
    }

    const cartSubtotal = Number(subtotal) || 0;
    const cleanCode = code.trim().toUpperCase();

    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: `Coupon code "${cleanCode}" does not exist`,
      });
    }

    const check = validateCouponForAmount(coupon, cartSubtotal);

    if (!check.valid) {
      return res.status(400).json({
        success: false,
        message: check.message,
      });
    }

    res.status(200).json({
      success: true,
      message: `Coupon "${cleanCode}" applied! You save ₹${check.discountAmount}.`,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: check.discountAmount,
        minOrderValue: coupon.minOrderValue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  validateCoupon,
  validateCouponForAmount,
};
