import mongoose from 'mongoose';
import Coupon from '../../models/Coupon.js';
import Order from '../../models/Order.js';

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

/**
 * Checks whether a user (by userId, email, or phone) has already redeemed a coupon.
 * Cross-checks both the Coupon.usedBy log and the non-cancelled orders in Order collection.
 */
const checkUserCouponUsage = async (coupon, { userId = null, email = '', phone = '' } = {}) => {
  if (!coupon) return { alreadyUsed: false, usageCount: 0 };

  const perUserLimit = coupon.perUserLimit !== undefined ? Number(coupon.perUserLimit) : 1;
  const isOneTime = coupon.oneTimePerUser !== false && perUserLimit <= 1;

  const cleanEmail = email ? String(email).toLowerCase().trim() : '';
  const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
  const cleanUserId = userId ? String(userId) : '';

  // If no user identity details are provided, we cannot restrict
  if (!cleanUserId && !cleanEmail && !cleanPhone) {
    return { alreadyUsed: false, usageCount: 0 };
  }

  // 1. Check coupon's internal `usedBy` ledger
  let memoryCount = 0;
  if (Array.isArray(coupon.usedBy)) {
    for (const record of coupon.usedBy) {
      const recUserId = record.user ? String(record.user) : '';
      const recEmail = record.email ? String(record.email).toLowerCase().trim() : '';
      const recPhone = record.phone ? String(record.phone).replace(/\D/g, '').slice(-10) : '';

      const matchUser = cleanUserId && recUserId && cleanUserId === recUserId;
      const matchEmail = cleanEmail && recEmail && cleanEmail === recEmail;
      const matchPhone = cleanPhone && recPhone && cleanPhone === recPhone;

      if (matchUser || matchEmail || matchPhone) {
        memoryCount++;
      }
    }
  }

  // 2. Cross-check against actual non-cancelled orders in the Database
  const orConditions = [];
  if (cleanUserId && mongoose.Types.ObjectId.isValid(cleanUserId)) {
    orConditions.push({ customer: new mongoose.Types.ObjectId(cleanUserId) });
  }
  if (cleanEmail) {
    orConditions.push({ 'customerInfo.email': cleanEmail });
  }
  if (cleanPhone && cleanPhone.length >= 7) {
    orConditions.push({ 'customerInfo.phone': { $regex: new RegExp(`${cleanPhone}$`) } });
  }

  let dbOrderCount = 0;
  if (orConditions.length > 0) {
    try {
      dbOrderCount = await Order.countDocuments({
        couponCode: coupon.code,
        orderStatus: { $ne: 'Cancelled' },
        $or: orConditions,
      });
    } catch (e) {
      console.warn('[Coupon] Error querying existing user orders:', e.message);
    }
  }

  const totalUsed = Math.max(memoryCount, dbOrderCount);

  if (totalUsed >= perUserLimit) {
    return {
      alreadyUsed: true,
      usageCount: totalUsed,
      message: `Coupon code "${coupon.code}" has already been used. This coupon can only be used once per customer.`,
    };
  }

  return {
    alreadyUsed: false,
    usageCount: totalUsed,
  };
};

// @desc    Validate coupon code against cart subtotal and enforce 1-time per customer
// @route   POST /api/customer/coupons/validate
// @access  Public (Supports optional auth and guest details)
const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal, orderTotal, cartTotal, email: bodyEmail, phone: bodyPhone, userId: bodyUserId } = req.body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a coupon code',
      });
    }

    const cartSubtotal = Number(subtotal ?? orderTotal ?? cartTotal ?? 0);
    const cleanCode = code.trim().toUpperCase();

    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: `Coupon code "${cleanCode}" does not exist`,
      });
    }

    // 1. Validate base coupon rules (Active, Expiry, Global limit, Min order)
    const check = validateCouponForAmount(coupon, cartSubtotal);

    if (!check.valid) {
      return res.status(400).json({
        success: false,
        message: check.message,
      });
    }

    // 2. Strict One-Time Per Customer check
    const userId = req.user?._id || req.user?.id || bodyUserId || null;
    const email = req.user?.email || bodyEmail || '';
    const phone = req.user?.phone || bodyPhone || '';

    if (userId || email || phone) {
      const usageCheck = await checkUserCouponUsage(coupon, { userId, email, phone });
      if (usageCheck.alreadyUsed) {
        return res.status(400).json({
          success: false,
          alreadyUsed: true,
          message: usageCheck.message,
        });
      }
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
        isOneTime: coupon.oneTimePerUser !== false,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get active public coupons and primary promotional discount
// @route   GET /api/customer/coupons
// @route   GET /api/customer/coupons/active
// @access  Public (Enriched with user redemption status when user or query provided)
const getActiveCoupons = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      active: true,
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: now } },
      ],
    }).sort({ updatedAt: -1, createdAt: -1 });

    const userId = req.user?._id || req.user?.id || req.query.userId || null;
    const email = req.user?.email || req.query.email || '';
    const phone = req.user?.phone || req.query.phone || '';

    // Check usage status for each coupon if user context is available
    const enrichedCoupons = await Promise.all(
      coupons.map(async (cpn) => {
        const plain = cpn.toObject ? cpn.toObject() : { ...cpn };
        let alreadyUsed = false;

        if (userId || email || phone) {
          const check = await checkUserCouponUsage(cpn, { userId, email, phone });
          alreadyUsed = check.alreadyUsed;
        }

        return {
          ...plain,
          alreadyUsed,
          isOneTime: cpn.oneTimePerUser !== false,
        };
      })
    );

    let activeCoupon = null;
    let discountDisplay = '';

    // Pick first active coupon that the user has NOT already used
    const unredeemedCoupons = enrichedCoupons.filter((c) => !c.alreadyUsed);
    const top = unredeemedCoupons.length > 0 ? unredeemedCoupons[0] : (enrichedCoupons[0] || null);

    if (top) {
      const isFlat = top.discountType === 'flat' || top.discountType === 'fixed';
      discountDisplay = isFlat ? `₹${top.discountValue} OFF` : `${top.discountValue}% OFF`;

      activeCoupon = {
        id: top._id,
        _id: top._id,
        code: top.code,
        discountType: isFlat ? 'flat' : 'percentage',
        discountValue: top.discountValue,
        discountLabel: discountDisplay,
        minOrderValue: top.minOrderValue || 0,
        description: top.description || '',
        alreadyUsed: !!top.alreadyUsed,
      };
    }

    res.status(200).json({
      success: true,
      count: enrichedCoupons.length,
      coupons: enrichedCoupons,
      activeCoupon,
      discountDisplay,
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
  checkUserCouponUsage,
  getActiveCoupons,
};
