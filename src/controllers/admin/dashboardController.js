import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';

// @desc    Get comprehensive dashboard overview statistics (Using high-performance MongoDB Aggregations)
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    // 1. Database-side Order Aggregation for metrics & revenue (O(1) memory footprint)
    const [orderAggregation] = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrdersCount: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $ne: ['$orderStatus', 'Cancelled'] }, { $ifNull: ['$totalAmount', 0] }, 0],
            },
          },
          processingCount: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'Processing'] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'Pending'] }, 1, 0] },
          },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] },
          },
        },
      },
    ]) || [];

    const totalOrdersCount = orderAggregation?.totalOrdersCount || 0;
    const totalRevenue = Math.round(orderAggregation?.totalRevenue || 0);
    const processingCount = orderAggregation?.processingCount || 0;
    const pendingCount = orderAggregation?.pendingCount || 0;
    const deliveredCount = orderAggregation?.deliveredCount || 0;

    // 2. Customer accounts count
    const totalCustomersCount = await User.countDocuments({ role: 'customer' });

    // 3. Products counts and low stock alerts via native query filters
    const totalProductsCount = await Product.countDocuments();
    const outOfStockCount = await Product.countDocuments({ stock: 0 });

    const lowStockFilter = {
      $expr: {
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 5] }] },
        ],
      },
    };

    const lowStockCount = await Product.countDocuments(lowStockFilter);
    const lowStockProducts = await Product.find(lowStockFilter)
      .limit(10)
      .select('title productId sku stock lowStockThreshold image')
      .lean();

    // 4. Recent 5 orders with minimal projected fields
    const recentOrdersRaw = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber customerInfo items totalAmount orderStatus paymentStatus createdAt')
      .lean();

    const recentOrders = recentOrdersRaw.map((o) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.customerInfo?.name || 'Customer',
      customerEmail: o.customerInfo?.email || '',
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      totalAmount: o.totalAmount || 0,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));

    // 5. Weekly Sales Calculation via native database grouping for the past 7 days
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklySales = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklySalesAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          orderStatus: { $ne: 'Cancelled' },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' }, // MongoDB $dayOfWeek returns 1 for Sunday ... 7 for Saturday
          total: { $sum: '$totalAmount' },
        },
      },
    ]);

    const dayMapping = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    weeklySalesAgg.forEach((item) => {
      const dayName = dayMapping[item._id];
      if (dayName) {
        weeklySales[dayName] = Math.round(item.total || 0);
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        totalOrdersCount,
        totalCustomersCount,
        totalProductsCount,
        processingCount,
        pendingCount,
        deliveredCount,
        lowStockCount,
        outOfStockCount,
        weeklySales,
      },
      recentOrders,
      lowStockAlerts: lowStockProducts.map((p) => ({
        id: p._id,
        title: p.title,
        productId: p.productId || p.sku || `PRD-${String(p._id).slice(-6).toUpperCase()}`,
        sku: p.productId || p.sku,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold || 5,
        image: p.image || '',
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error loading dashboard analytics',
    });
  }
};

export {
  getDashboardStats,
};
