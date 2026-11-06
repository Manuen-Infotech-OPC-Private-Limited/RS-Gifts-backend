import Order from '../../models/Order.js';
import { restockInventory } from '../../services/orderService.js';

// Helper to find an order by MongoDB _id or 6-char orderNumber (e.g. RSR78Q)
const findOrderByIdOrNumber = async (id, populateCustomer = false) => {
  if (!id) return null;
  const str = String(id).trim();
  let query = null;
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    query = Order.findById(str);
  } else {
    query = Order.findOne({ orderNumber: str.toUpperCase() });
  }
  query = query.populate('items.product', 'title image images sku productId price category active');
  if (populateCustomer) {
    query = query.populate('customer', 'name email phone');
  }
  let order = await query;
  if (!order && /^[0-9a-fA-F]{24}$/.test(str)) {
    order = await Order.findOne({ orderNumber: str.toUpperCase() }).populate('items.product', 'title image images sku productId price category active');
  }
  return order;
};

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

    let query = Order.find(filter).populate('items.product', 'title image images sku productId price category active');

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
    const order = await findOrderByIdOrNumber(req.params.id, true);
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

    const order = await findOrderByIdOrNumber(req.params.id);
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

    const order = await findOrderByIdOrNumber(req.params.id);
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
      order: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update courier tracking information
// @route   PATCH /api/admin/orders/:id/tracking
// @access  Private (Admin)
const updateOrderTracking = async (req, res) => {
  try {
    const { carrier, trackingNumber, trackingUrl } = req.body;
    let order = null;

    if (req.params.id && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(req.params.id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.id.toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.tracking = {
      carrier: carrier !== undefined ? carrier : (order.tracking?.carrier || ''),
      trackingNumber: trackingNumber !== undefined ? trackingNumber : (order.tracking?.trackingNumber || ''),
      trackingUrl: trackingUrl !== undefined ? trackingUrl : (order.tracking?.trackingUrl || ''),
    };

    if (trackingNumber && (order.orderStatus === 'Pending' || order.orderStatus === 'Processing')) {
      order.orderStatus = 'Shipped';
      order.statusHistory.push({
        status: 'Shipped',
        timestamp: new Date(),
        note: carrier
          ? `Dispatched via ${carrier} (${trackingNumber})`
          : `Dispatched with tracking #${trackingNumber}`,
      });
    }

    const updated = await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} courier tracking updated`,
      order: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete an order
// @route   DELETE /api/admin/orders/:id
// @access  Private (Admin)
const deleteOrder = async (req, res) => {
  try {
    let order = null;
    if (req.params.id && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findByIdAndDelete(req.params.id);
    }
    if (!order) {
      order = await Order.findOneAndDelete({ orderNumber: req.params.id.toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderTracking,
  deleteOrder,
};
