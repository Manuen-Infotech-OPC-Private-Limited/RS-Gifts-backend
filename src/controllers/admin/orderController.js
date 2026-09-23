const Order = require('../../models/Order');
const { restockInventory } = require('../../services/orderService');

// @desc    Get all orders with filtering and search
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getOrders = async (req, res) => {
  try {
    const { status, paymentStatus, search, sort } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.orderStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      filter.paymentStatus = paymentStatus;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: search, $options: 'i' } },
      ];
    }

    let query = Order.find(filter);

    if (sort === 'oldest') {
      query = query.sort({ createdAt: 1 });
    } else if (sort === 'amount_desc') {
      query = query.sort({ totalAmount: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const orders = await query;

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

// @desc    Get single order details by ID
// @route   GET /api/admin/orders/:id
// @access  Private (Admin)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer', 'name email phone');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
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

// @desc    Update order status
// @route   PATCH /api/admin/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = status;

    // If order is newly cancelled, restock the product inventory
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      await restockInventory(order.items);
    }

    // Append to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Order status updated to ${status} by admin`,
    });

    const updated = await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} status updated to "${status}"`,
      order: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update payment status
// @route   PATCH /api/admin/orders/:id/payment-status
// @access  Private (Admin)
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const validStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.paymentStatus = paymentStatus;
    const updated = await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} payment marked as "${paymentStatus}"`,
      order: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
};
