const Coupon = require('../../models/Coupon');

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private (Admin)
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new coupon
// @route   POST /api/admin/coupons
// @access  Private (Admin)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      expiryDate,
      usageLimit,
      active,
    } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and discount value are required',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Coupon with code "${cleanCode}" already exists`,
      });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      description: description || '',
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : 0,
      expiryDate: expiryDate || null,
      usageLimit: usageLimit ? Number(usageLimit) : 0,
      active: active !== undefined ? Boolean(active) : true,
    });

    res.status(201).json({
      success: true,
      message: `Coupon "${coupon.code}" created successfully`,
      coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private (Admin)
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    if (req.body.code && req.body.code.trim().toUpperCase() !== coupon.code) {
      const existing = await Coupon.findOne({ code: req.body.code.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Coupon code "${req.body.code}" is already in use`,
        });
      }
      coupon.code = req.body.code.trim().toUpperCase();
    }

    if (req.body.description !== undefined) coupon.description = req.body.description;
    if (req.body.discountType) coupon.discountType = req.body.discountType;
    if (req.body.discountValue !== undefined) coupon.discountValue = Number(req.body.discountValue);
    if (req.body.minOrderValue !== undefined) coupon.minOrderValue = Number(req.body.minOrderValue);
    if (req.body.maxDiscount !== undefined) coupon.maxDiscount = Number(req.body.maxDiscount);
    if (req.body.expiryDate !== undefined) coupon.expiryDate = req.body.expiryDate || null;
    if (req.body.usageLimit !== undefined) coupon.usageLimit = Number(req.body.usageLimit);
    if (req.body.active !== undefined) coupon.active = Boolean(req.body.active);

    const updated = await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon "${updated.code}" updated successfully`,
      coupon: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private (Admin)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" deleted successfully`,
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle coupon active status
// @route   PATCH /api/admin/coupons/:id/toggle-active
// @access  Private (Admin)
const toggleCouponActive = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    coupon.active = !coupon.active;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" is now ${coupon.active ? 'Active' : 'Disabled'}`,
      coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
};
