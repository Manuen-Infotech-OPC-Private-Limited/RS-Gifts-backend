import Coupon from '../../models/Coupon.js';

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
      minSpend,
      maxDiscount,
      expiryDate,
      usageLimit,
      active,
    } = req.body;

    if (!code || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and discount value are required',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const finalType = (discountType === 'fixed' || discountType === 'flat') ? 'flat' : 'percentage';
    const finalMinOrder = minOrderValue !== undefined ? Number(minOrderValue) : (minSpend !== undefined ? Number(minSpend) : 0);

    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      existing.discountType = finalType;
      existing.discountValue = Number(discountValue);
      existing.minOrderValue = finalMinOrder;
      if (maxDiscount !== undefined) existing.maxDiscount = Number(maxDiscount);
      if (expiryDate !== undefined) existing.expiryDate = expiryDate || null;
      if (usageLimit !== undefined) existing.usageLimit = Number(usageLimit);
      if (active !== undefined) existing.active = Boolean(active);
      if (description !== undefined) existing.description = description;
      const updated = await existing.save();
      return res.status(200).json({
        success: true,
        message: `Coupon "${updated.code}" updated successfully`,
        coupon: updated,
      });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      description: description || '',
      discountType: finalType,
      discountValue: Number(discountValue),
      minOrderValue: finalMinOrder,
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
    let coupon = null;
    const targetId = req.params.id;

    // Try finding by ObjectId or by code
    if (targetId && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      coupon = await Coupon.findById(targetId);
    }
    if (!coupon && req.body.code) {
      coupon = await Coupon.findOne({ code: req.body.code.trim().toUpperCase() });
    }

    if (!coupon) {
      // If coupon doesn't exist yet, create it as upsert
      const cleanCode = (req.body.code || targetId).trim().toUpperCase();
      const finalType = (req.body.discountType === 'fixed' || req.body.discountType === 'flat') ? 'flat' : 'percentage';
      const created = await Coupon.create({
        code: cleanCode,
        description: req.body.description || '',
        discountType: finalType,
        discountValue: Number(req.body.discountValue) || 0,
        minOrderValue: Number(req.body.minOrderValue ?? req.body.minSpend ?? 0),
        maxDiscount: Number(req.body.maxDiscount || 0),
        expiryDate: req.body.expiryDate || null,
        usageLimit: Number(req.body.usageLimit || 0),
        active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      });
      return res.status(200).json({
        success: true,
        message: `Coupon "${created.code}" saved successfully`,
        coupon: created,
      });
    }

    if (req.body.code && req.body.code.trim().toUpperCase() !== coupon.code) {
      const existing = await Coupon.findOne({ code: req.body.code.trim().toUpperCase() });
      if (existing && existing._id.toString() !== coupon._id.toString()) {
        return res.status(400).json({
          success: false,
          message: `Coupon code "${req.body.code}" is already in use`,
        });
      }
      coupon.code = req.body.code.trim().toUpperCase();
    }

    if (req.body.description !== undefined) coupon.description = req.body.description;
    if (req.body.discountType) {
      coupon.discountType = (req.body.discountType === 'fixed' || req.body.discountType === 'flat') ? 'flat' : 'percentage';
    }
    if (req.body.discountValue !== undefined) coupon.discountValue = Number(req.body.discountValue);
    if (req.body.minOrderValue !== undefined || req.body.minSpend !== undefined) {
      coupon.minOrderValue = Number(req.body.minOrderValue ?? req.body.minSpend ?? 0);
    }
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

export {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
};
