import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
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

// @desc    Get order details by orderNumber or ID
// @route   GET /api/customer/orders/:idOrNumber
// @access  Public (Can verify with email) or Customer
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

    // If user is logged in, ensure ownership
    if (req.user && order.customer && order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order',
      });
    }

    res.status(200).json({
      success: true,
      order,
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
// @access  Private (Customer) or Verified email
const cancelCustomerOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (req.user && order.customer && order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this order',
      });
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
