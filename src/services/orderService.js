import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Setting from '../models/Setting.js';
import { validateCouponForAmount } from '../controllers/customer/customerCouponController.js';

// Generate human-friendly unique 10-character alphanumeric order number
// Format: strictly 10 characters (combination of uppercase letters and numbers), e.g. "RS8K29MA4X"
const generateOrderNumber = async () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const allChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let attempt = 0; attempt < 10; attempt++) {
    let chars = '';
    // Guarantee mix of numbers and letters in the 8 random characters
    for (let i = 0; i < 3; i++) {
      chars += digits[Math.floor(Math.random() * digits.length)];
    }
    for (let i = 0; i < 2; i++) {
      chars += letters[Math.floor(Math.random() * letters.length)];
    }
    for (let i = 0; i < 3; i++) {
      chars += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the 8 characters
    const shuffled = chars
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
    const candidate = `RS${shuffled}`; // Strictly 2 + 8 = 10 characters

    try {
      const existing = await Order.findOne({ orderNumber: candidate });
      if (!existing) {
        return candidate;
      }
    } catch {
      return candidate;
    }
  }

  // Fallback strictly 10 characters if loop exhausts
  const randNum = Math.floor(1000 + Math.random() * 9000).toString();
  let randL = '';
  for (let i = 0; i < 4; i++) {
    randL += letters[Math.floor(Math.random() * letters.length)];
  }
  return `RS${randNum}${randL}`.slice(0, 10);
};

// Validate cart items and calculate totals using real database prices
const calculateOrderPricing = async (items = [], couponCode = null) => {
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
  const settings = (await Setting.findOne()) || {
    standardShippingFee: 50,
    freeShippingThreshold: 999,
  };

  let shippingFee = 0;
  if (subtotal < (settings.freeShippingThreshold || 999)) {
    shippingFee = settings.standardShippingFee || 50;
  }

  // Evaluate coupon discount
  let discountAmount = 0;
  let appliedCoupon = null;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim() !== '') {
    const coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      active: true,
    });

    if (coupon) {
      const validation = validateCouponForAmount(coupon, subtotal);
      if (validation.valid) {
        discountAmount = validation.discountAmount;
        appliedCoupon = coupon;
      }
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

// Deduct inventory when order is confirmed
const deductInventory = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }
};

// Restock inventory when order is cancelled
const restockInventory = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }
};

export {
  generateOrderNumber,
  calculateOrderPricing,
  deductInventory,
  restockInventory,
};
