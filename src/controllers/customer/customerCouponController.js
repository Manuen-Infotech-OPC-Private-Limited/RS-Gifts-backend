const Coupon = require('../../models/Coupon');

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

    const check = coupon.isValidForAmount(cartSubtotal);

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

module.exports = {
  validateCoupon,
};
