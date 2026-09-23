const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Setting = require('../models/Setting');

// Generate human-friendly unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RS-ORD-${timestamp}-${randomSuffix}`;
};

// Validate cart items and calculate totals using real database prices
const calculateOrderPricing = async (items = [], couponCode = null) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order items list cannot be empty');
  }

  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product not found with ID: ${item.product}`);
    }

    if (!product.active) {
      throw new Error(`Product "${product.title}" is currently unavailable for purchase`);
    }

    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (product.stock < qty) {
      throw new Error(
        `Insufficient stock for "${product.title}". Requested: ${qty}, In Stock: ${product.stock}`
      );
    }

    // Determine current effective price (sale price if lower than regular)
    const effectivePrice =
      product.salePrice && product.salePrice < product.price
        ? product.salePrice
        : product.price;

    const itemTotal = effectivePrice * qty;
    subtotal += itemTotal;

    verifiedItems.push({
      product: product._id,
      title: product.title,
      sku: product.sku,
      price: effectivePrice,
      quantity: qty,
      image: product.image,
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
      const validation = coupon.isValidForAmount(subtotal);
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

module.exports = {
  generateOrderNumber,
  calculateOrderPricing,
  deductInventory,
  restockInventory,
};
