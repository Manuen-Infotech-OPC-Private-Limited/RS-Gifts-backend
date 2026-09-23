const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');

// @desc    Get comprehensive dashboard overview statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    // 1. Order aggregation for revenue and processing count
    const orders = await Order.find().sort({ createdAt: -1 });

    const totalOrdersCount = orders.length;
    const totalRevenue = orders.reduce((sum, ord) => {
      // Exclude cancelled orders from fulfilled revenue
      if (ord.orderStatus !== 'Cancelled') {
        return sum + (ord.totalAmount || 0);
      }
      return sum;
    }, 0);

    const processingCount = orders.filter((o) => o.orderStatus === 'Processing').length;
    const pendingCount = orders.filter((o) => o.orderStatus === 'Pending').length;
    const deliveredCount = orders.filter((o) => o.orderStatus === 'Delivered').length;

    // 2. Customer accounts count
    const totalCustomersCount = await User.countDocuments({ role: 'customer' });

    // 3. Products & stock alert count
    const products = await Product.find();
    const totalProductsCount = products.length;
    const lowStockProducts = products.filter(
      (p) => p.stock <= (p.lowStockThreshold || 5) && p.stock > 0
    );
    const outOfStockProducts = products.filter((p) => p.stock === 0);

    // 4. Recent 5 orders with formatted info
    const recentOrders = orders.slice(0, 5).map((o) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.customerInfo?.name || 'Customer',
      customerEmail: o.customerInfo?.email || '',
      itemsCount: o.items.length,
      totalAmount: o.totalAmount,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));

    // 5. Weekly Sales Calculation (for the past 7 days)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklySales = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    orders.forEach((o) => {
      if (new Date(o.createdAt) >= sevenDaysAgo && o.orderStatus !== 'Cancelled') {
        const dayName = daysOfWeek[new Date(o.createdAt).getDay()];
        weeklySales[dayName] = (weeklySales[dayName] || 0) + (o.totalAmount || 0);
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
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        weeklySales,
      },
      recentOrders,
      lowStockAlerts: lowStockProducts.map((p) => ({
        id: p._id,
        title: p.title,
        sku: p.sku,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        image: p.image,
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

module.exports = {
  getDashboardStats,
};
