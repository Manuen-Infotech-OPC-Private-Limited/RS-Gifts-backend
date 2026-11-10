import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import { generateOrderNumber,
  calculateOrderPricing,
  deductInventory,
  restockInventory, } from '../../services/orderService.js';

// @desc    Place a new gift order (Checkout)
// @route   POST /api/customer/orders
// @access  Public (Optional auth for guest or logged-in user)
const createCustomerOrder = async (req, res) => {
  try {
    const { items, customerInfo, shippingAddress, paymentMethod, couponCode, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add gifts before checking out.',
      });
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, email, and phone number are required for order delivery.',
      });
    }

    if (
      !shippingAddress ||
      !shippingAddress.recipientName ||
      !shippingAddress.phone ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required for delivery.',
      });
    }

    // Calculate real database pricing and verify stock
    const pricing = await calculateOrderPricing(items, couponCode);

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer: req.user ? req.user._id : null,
      customerInfo: {
        name: customerInfo.name.trim(),
        email: customerInfo.email.toLowerCase().trim(),
        phone: customerInfo.phone.trim(),
      },
      shippingAddress: {
        recipientName: shippingAddress.recipientName.trim(),
        phone: shippingAddress.phone.trim(),
        addressLine1: shippingAddress.addressLine1.trim(),
        addressLine2: shippingAddress.addressLine2 ? shippingAddress.addressLine2.trim() : '',
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        country: shippingAddress.country || 'India',
      },
      items: pricing.verifiedItems,
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      discountAmount: pricing.discountAmount,
      couponCode: pricing.couponCode,
      totalAmount: pricing.totalAmount,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending',
      orderStatus: 'Pending',
      inventoryDeducted: false,
      notes: notes || '',
      statusHistory: [
        {
          status: 'Pending',
          timestamp: new Date(),
          note: 'Order placed by customer',
        },
      ],
    });

    // Note: Stock is NOT deducted on order placement.
    // Stock is deducted only when Admin marks the order status as "Delivered".

    // Auto-save shipping address to customer profile so it always reflects in Customer profile & Admin
    try {
      const userDoc = req.user 
        ? await User.findById(req.user._id)
        : await User.findOne({ email: customerInfo.email.toLowerCase().trim() });

      if (userDoc) {
        const fullAddrStr = [shippingAddress.addressLine1, shippingAddress.addressLine2, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode].filter(Boolean).join(', ');
        if (!userDoc.address || userDoc.address === '—' || userDoc.address === 'Not provided') {
          userDoc.address = fullAddrStr;
        }

        const cleanLine1 = shippingAddress.addressLine1.trim().toLowerCase();
        const cleanPin = String(shippingAddress.postalCode || '').trim();
        const alreadyHasAddr = (userDoc.addresses || []).some((a) => {
          const aLine = (a.addressLine1 || '').trim().toLowerCase();
          const aPin = String(a.postalCode || '').trim();
          return aLine === cleanLine1 || (aLine.includes(cleanLine1) && aPin === cleanPin);
        });

        if (!alreadyHasAddr) {
          userDoc.addresses.push({
            recipientName: shippingAddress.recipientName.trim(),
            phone: shippingAddress.phone.trim(),
            addressLine1: shippingAddress.addressLine1.trim(),
            addressLine2: shippingAddress.addressLine2 ? shippingAddress.addressLine2.trim() : '',
            city: shippingAddress.city.trim(),
            state: shippingAddress.state.trim(),
            postalCode: shippingAddress.postalCode.trim(),
            country: shippingAddress.country || 'India',
            isDefault: userDoc.addresses.length === 0,
          });
        }

        await userDoc.save();
      }
    } catch (saveErr) {
      console.warn('Auto-save shipping address to user profile warning:', saveErr.message);
    }

    // Increment coupon usedCount if coupon was applied
    if (pricing.appliedCoupon) {
      await Coupon.findByIdAndUpdate(pricing.appliedCoupon._id, {
        $inc: { usedCount: 1 },
      });
    }

    res.status(201).json({
      success: true,
      message: `Order #${order.orderNumber} placed successfully!`,
      order,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to place order. Please review your cart.',
    });
  }
};

// @desc    Get order history for logged-in customer
// @route   GET /api/customer/orders/my
// @access  Private (Customer)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ customer: req.user._id }, { 'customerInfo.email': req.user.email.toLowerCase() }],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper to mask sensitive address & phone PII for unauthenticated/guest tracking
const maskOrderPII = (orderDoc) => {
  const orderObj = orderDoc.toObject ? orderDoc.toObject() : { ...orderDoc };
  if (orderObj.shippingAddress) {
    orderObj.shippingAddress = {
      recipientName: orderObj.shippingAddress.recipientName || '',
      city: orderObj.shippingAddress.city || '',
      state: orderObj.shippingAddress.state || '',
      postalCode: orderObj.shippingAddress.postalCode || '',
      country: orderObj.shippingAddress.country || 'India',
      addressLine1: '*** [Protected for privacy]',
      addressLine2: '',
      phone: orderObj.shippingAddress.phone
        ? orderObj.shippingAddress.phone.replace(/.(?=.{4})/g, '*')
        : '',
    };
  }
  if (orderObj.customerInfo) {
    orderObj.customerInfo = {
      name: orderObj.customerInfo.name || '',
      email: orderObj.customerInfo.email
        ? orderObj.customerInfo.email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length))
        : '',
      phone: orderObj.customerInfo.phone
        ? orderObj.customerInfo.phone.replace(/.(?=.{4})/g, '*')
        : '',
    };
  }
  return orderObj;
};

// @desc    Get order details by orderNumber or ID
// @route   GET /api/customer/orders/:idOrNumber
// @access  Protected (Customer owner / Admin) or Verified with matching email/phone
const getCustomerOrderDetails = async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    let order;

    if (idOrNumber.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(idOrNumber);
    } else {
      order = await Order.findOne({ orderNumber: idOrNumber.toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const isOwner = req.user && order.customer && order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    // 1. Registered Customer Order - Require customer login or verified email
    if (order.customer) {
      if (isOwner || isAdmin) {
        return res.status(200).json({
          success: true,
          order,
        });
      }

      // If user is logged in as another user, forbid immediately
      if (req.user) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to view this order.',
        });
      }

      // If unauthenticated, check if matching email query parameter was provided
      const verifyEmail = (req.query.email || req.headers['x-order-email'] || '').trim().toLowerCase();
      const orderEmail = (order.customerInfo?.email || '').trim().toLowerCase();

      if (!verifyEmail) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in with the registered account to view this order.',
        });
      }

      if (verifyEmail !== orderEmail) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Email address does not match this order.',
        });
      }

      // Matching email provided by unauthenticated tracker: return order with masked PII
      return res.status(200).json({
        success: true,
        order: maskOrderPII(order),
      });
    }

    // 2. Guest Order - Require verification via email or phone
    if (isAdmin) {
      return res.status(200).json({
        success: true,
        order,
      });
    }

    const verifyEmail = (req.query.email || req.headers['x-order-email'] || '').trim().toLowerCase();
    const verifyPhone = (req.query.phone || '').trim().replace(/[^0-9]/g, '');
    const orderEmail = (order.customerInfo?.email || '').trim().toLowerCase();
    const orderPhone = (order.customerInfo?.phone || order.shippingAddress?.phone || '').trim().replace(/[^0-9]/g, '');

    if (!verifyEmail && !verifyPhone) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Verification required: please provide the email address or phone number used during checkout to view this order.',
      });
    }

    const emailMatches = verifyEmail && orderEmail && verifyEmail === orderEmail;
    const phoneMatches = verifyPhone && orderPhone && (orderPhone.endsWith(verifyPhone) || verifyPhone.endsWith(orderPhone));

    if (!emailMatches && !phoneMatches) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. The provided email or phone does not match this order.',
      });
    }

    return res.status(200).json({
      success: true,
      order: maskOrderPII(order),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel order (if still Pending or Processing)
// @route   POST /api/customer/orders/:id/cancel
// @access  Private (Customer owner / Admin) or Verified email
const cancelCustomerOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const isOwner = req.user && order.customer && order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    const verifyEmail = (req.body.email || req.query.email || req.headers['x-order-email'] || '').trim().toLowerCase();
    const orderEmail = (order.customerInfo?.email || '').trim().toLowerCase();
    const emailMatches = verifyEmail && orderEmail && verifyEmail === orderEmail;

    if (order.customer) {
      if (!isOwner && !isAdmin && !emailMatches) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must be logged in with the registered account or provide the verified order email to cancel this order.',
        });
      }
    } else {
      if (!isAdmin && !emailMatches) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Please provide the matching email address used during checkout to cancel this guest order.',
        });
      }
    }

    if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Processing') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled as it is already "${order.orderStatus}"`,
      });
    }

    order.orderStatus = 'Cancelled';
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: req.body.reason || 'Order cancelled by customer',
    });

    // Restock the product inventory only if it was previously deducted (e.g., delivered)
    if (order.inventoryDeducted) {
      await restockInventory(order.items);
      order.inventoryDeducted = false;
      order.inventoryDeductedAt = null;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} has been successfully cancelled`,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  createCustomerOrder,
  getMyOrders,
  getCustomerOrderDetails,
  cancelCustomerOrder,
};
