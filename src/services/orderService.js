import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Setting from '../models/Setting.js';
import { validateCouponForAmount, checkUserCouponUsage } from '../controllers/customer/customerCouponController.js';

// Generate human-friendly unique 6-character alphanumeric order number
// Format: strictly 6 characters (combination of uppercase alphabets and numbers), e.g. "RS4K92"
const generateOrderNumber = async () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const allChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let attempt = 0; attempt < 15; attempt++) {
    // Prefix RS (2 letters) + 4 mixed alphanumeric chars (guaranteed digits and letters)
    let trailing = '';
    trailing += digits[Math.floor(Math.random() * digits.length)];
    trailing += digits[Math.floor(Math.random() * digits.length)];
    trailing += letters[Math.floor(Math.random() * letters.length)];
    trailing += allChars[Math.floor(Math.random() * allChars.length)];

    const shuffled = trailing
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
    const candidate = `RS${shuffled}`; // Strictly 2 + 4 = 6 characters

    try {
      const existing = await Order.findOne({ orderNumber: candidate });
      if (!existing) {
        return candidate;
      }
    } catch {
      return candidate;
    }
  }

  // Fallback strictly 6 characters if loop exhausts
  const randNum = Math.floor(10 + Math.random() * 90).toString();
  const randL1 = letters[Math.floor(Math.random() * letters.length)];
  const randL2 = letters[Math.floor(Math.random() * letters.length)];
  return `RS${randNum}${randL1}${randL2}`.slice(0, 6);
};

// Validate cart items and calculate totals using real database prices
const calculateOrderPricing = async (items = [], couponCode = null, customerInfo = null, user = null) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order items list cannot be empty');
  }

  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    let product = null;
    const identifier = item.product || item.id || item._id;

    if (identifier && mongoose.Types.ObjectId.isValid(identifier)) {
      product = await Product.findById(identifier);
    }

    if (!product && identifier) {
      product = await Product.findOne({
        $or: [
          { productId: String(identifier).toUpperCase() },
          { sku: String(identifier).toUpperCase() },
          { slug: String(identifier).toLowerCase() }
        ]
      });
    }

    if (!product && (item.title || item.name)) {
      const searchTitle = (item.title || item.name).trim();
      product = await Product.findOne({
        title: { $regex: new RegExp(`^${searchTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }

    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);

    if (product) {
      if (!product.active) {
        throw new Error(`Product "${product.title}" is currently unavailable for purchase`);
      }
      if (product.stock < qty) {
        throw new Error(
          `Insufficient stock for "${product.title}". Requested: ${qty}, In Stock: ${product.stock}`
        );
      }
    }

    // Determine current effective price (sale price if lower than regular)
    const effectivePrice = product
      ? ((product.salePrice && product.salePrice < product.price) ? product.salePrice : product.price)
      : (Number(item.price) || 0);

    const itemTotal = effectivePrice * qty;
    subtotal += itemTotal;

    verifiedItems.push({
      product: product ? product._id : null,
      title: product ? product.title : (item.title || item.name || 'Gift Item'),
      productId: product ? (product.productId || product.sku) : (item.productId || 'PRD-0001'),
      sku: product ? (product.sku || product.productId) : (item.sku || 'RS-GIFT'),
      price: effectivePrice,
      quantity: qty,
      image: product ? product.image : (item.image || ''),
      personalizationData: item.personalizationData || {},
    });
  }

  // Fetch store shipping settings
  const settings = await Setting.findOne();
  const standardFee = (settings && settings.standardShippingFee !== undefined && settings.standardShippingFee !== null)
    ? Number(settings.standardShippingFee)
    : 0;
  const freeThreshold = (settings && settings.freeShippingThreshold !== undefined && settings.freeShippingThreshold !== null)
    ? Number(settings.freeShippingThreshold)
    : 0;

  let shippingFee = 0;
  if (standardFee > 0) {
    if (freeThreshold > 0 && subtotal >= freeThreshold) {
      shippingFee = 0;
    } else {
      shippingFee = standardFee;
    }
  } else {
    shippingFee = 0;
  }

  // Evaluate coupon discount
  let discountAmount = 0;
  let appliedCoupon = null;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim() !== '') {
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({
      code: cleanCode,
      active: true,
    });

    if (coupon) {
      // 1. Standard amount & limits check
      const validation = validateCouponForAmount(coupon, subtotal);
      if (!validation.valid) {
        throw new Error(validation.message || `Coupon "${coupon.code}" cannot be applied.`);
      }

      // 2. Strict One-Time Per Customer check
      const userId = user?._id || user?.id || null;
      const email = customerInfo?.email || user?.email || '';
      const phone = customerInfo?.phone || user?.phone || '';

      if (userId || email || phone) {
        const usageCheck = await checkUserCouponUsage(coupon, { userId, email, phone });
        if (usageCheck.alreadyUsed) {
          throw new Error(usageCheck.message || `Coupon "${coupon.code}" has already been used on your account. It is valid for one-time use only.`);
        }
      }

      discountAmount = validation.discountAmount;
      appliedCoupon = coupon;
    } else {
      throw new Error(`Coupon code "${cleanCode}" is invalid or expired.`);
    }
  }

  const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);

  return {
    verifiedItems,
    subtotal,
    shippingFee,
    discountAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : '',
    totalAmount,
    appliedCoupon,
  };
};

// Deduct inventory when order is marked as Delivered by admin
const deductInventory = async (items) => {
  if (!items || !Array.isArray(items)) return;
  for (const item of items) {
    const prodId = item.product?._id || item.product || item.id || item._id;
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (prodId) {
      const updated = await Product.findByIdAndUpdate(
        prodId,
        { $inc: { stock: -qty } },
        { new: true }
      );
      if (updated && updated.stock < 0) {
        await Product.findByIdAndUpdate(prodId, { $set: { stock: 0 } });
      }
    }
  }
};

// Restock inventory when an order moves away from Delivered (or Delivered order is cancelled)
const restockInventory = async (items) => {
  if (!items || !Array.isArray(items)) return;
  for (const item of items) {
    const prodId = item.product?._id || item.product || item.id || item._id;
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (prodId) {
      await Product.findByIdAndUpdate(prodId, {
        $inc: { stock: qty },
      });
    }
  }
};

export {
  generateOrderNumber,
  calculateOrderPricing,
  deductInventory,
  restockInventory,
};
