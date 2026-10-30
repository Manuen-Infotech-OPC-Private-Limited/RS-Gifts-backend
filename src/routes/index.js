import { getActiveCategories, getActiveOccasions, getActiveBanners, getPublicSettings } from '../controllers/customer/customerContentController.js';
import mongoose from 'mongoose';
import express from 'express';
const router = express.Router();

// Admin Routes
import adminAuthRoutes from './admin/authRoutes.js';
import adminDashboardRoutes from './admin/dashboardRoutes.js';
import adminProductRoutes from './admin/productRoutes.js';
import adminCategoryRoutes from './admin/categoryRoutes.js';
import adminOccasionRoutes from './admin/occasionRoutes.js';
import adminOrderRoutes from './admin/orderRoutes.js';
import adminCustomerRoutes from './admin/customerRoutes.js';
import adminCouponRoutes from './admin/couponRoutes.js';
import adminBannerRoutes from './admin/bannerRoutes.js';
import adminReviewRoutes from './admin/reviewRoutes.js';
import adminSettingRoutes from './admin/settingRoutes.js';
import adminInquiryRoutes from './admin/inquiryRoutes.js';

// Customer Routes
import customerAuthRoutes from './customer/customerAuthRoutes.js';
import customerProductRoutes from './customer/customerProductRoutes.js';
import customerOrderRoutes from './customer/customerOrderRoutes.js';
import customerCouponRoutes from './customer/customerCouponRoutes.js';
import customerReviewRoutes from './customer/customerReviewRoutes.js';
import customerContentRoutes from './customer/customerContentRoutes.js';
import customerInquiryRoutes from './customer/customerInquiryRoutes.js';

// Upload Routes
import uploadRoutes from './uploadRoutes.js';

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ONLINE',
    service: 'RS-Gifts API',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(1)}s`,
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
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
router.use('/admin/inquiries', adminInquiryRoutes);

// Customer Route Mounts
router.use('/customer/auth', customerAuthRoutes);
router.use('/customer/products', customerProductRoutes);
router.use('/customer/orders', customerOrderRoutes);
router.use('/customer/coupons', customerCouponRoutes);
router.use('/customer/reviews', customerReviewRoutes);
router.use('/customer/content', customerContentRoutes);
router.use('/customer/inquiries', customerInquiryRoutes);
router.use('/customer', customerContentRoutes);

// Direct Uploads Route
router.use('/upload', uploadRoutes);

// Direct compatibility aliases (for frontends calling /api/products, /api/orders, /api/banners, etc.)
router.use('/products', customerProductRoutes);
router.use('/orders', customerOrderRoutes);
router.get('/categories', getActiveCategories);
router.get('/occasions', getActiveOccasions);
router.get('/banners', getActiveBanners);
router.get('/settings', getPublicSettings);
router.use('/categories', customerContentRoutes);
router.use('/occasions', customerContentRoutes);
router.use('/banners', customerContentRoutes);
router.use('/coupons', customerCouponRoutes);
router.use('/inquiries', customerInquiryRoutes);
router.use('/contact', customerInquiryRoutes);

export default router;
