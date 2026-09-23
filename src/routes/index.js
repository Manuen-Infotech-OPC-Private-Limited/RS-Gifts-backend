const express = require('express');
const router = express.Router();

// Admin Routes
const adminAuthRoutes = require('./admin/authRoutes');
const adminDashboardRoutes = require('./admin/dashboardRoutes');
const adminProductRoutes = require('./admin/productRoutes');
const adminCategoryRoutes = require('./admin/categoryRoutes');
const adminOccasionRoutes = require('./admin/occasionRoutes');
const adminOrderRoutes = require('./admin/orderRoutes');
const adminCustomerRoutes = require('./admin/customerRoutes');
const adminCouponRoutes = require('./admin/couponRoutes');
const adminBannerRoutes = require('./admin/bannerRoutes');
const adminReviewRoutes = require('./admin/reviewRoutes');
const adminSettingRoutes = require('./admin/settingRoutes');

// Customer Routes
const customerAuthRoutes = require('./customer/customerAuthRoutes');
const customerProductRoutes = require('./customer/customerProductRoutes');
const customerOrderRoutes = require('./customer/customerOrderRoutes');
const customerCouponRoutes = require('./customer/customerCouponRoutes');
const customerReviewRoutes = require('./customer/customerReviewRoutes');
const customerContentRoutes = require('./customer/customerContentRoutes');

// Upload Routes
const uploadRoutes = require('./uploadRoutes');

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ONLINE',
    service: 'RS-Gifts API',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(1)}s`,
    database: require('mongoose').connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
  });
});

// Admin Route Mounts
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/dashboard', adminDashboardRoutes);
router.use('/admin/products', adminProductRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/admin/occasions', adminOccasionRoutes);
router.use('/admin/orders', adminOrderRoutes);
router.use('/admin/customers', adminCustomerRoutes);
router.use('/admin/coupons', adminCouponRoutes);
router.use('/admin/content/banners', adminBannerRoutes);
router.use('/admin/reviews', adminReviewRoutes);
router.use('/admin/settings', adminSettingRoutes);

// Customer Route Mounts
router.use('/customer/auth', customerAuthRoutes);
router.use('/customer/products', customerProductRoutes);
router.use('/customer/orders', customerOrderRoutes);
router.use('/customer/coupons', customerCouponRoutes);
router.use('/customer/reviews', customerReviewRoutes);
router.use('/customer/content', customerContentRoutes);

// Direct Uploads Route
router.use('/upload', uploadRoutes);

// Direct compatibility aliases (for frontends calling /api/products, /api/orders, etc.)
router.use('/products', customerProductRoutes);
router.use('/categories', (req, res, next) => {
  const { getActiveCategories } = require('../controllers/customer/customerContentController');
  getActiveCategories(req, res, next);
});
router.use('/occasions', (req, res, next) => {
  const { getActiveOccasions } = require('../controllers/customer/customerContentController');
  getActiveOccasions(req, res, next);
});
router.use('/coupons', customerCouponRoutes);

module.exports = router;
