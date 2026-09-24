import express from 'express';
const router = express.Router();
import { createCustomerReview,
  getProductReviews, } from '../../controllers/customer/customerReviewController.js';
import { optionalAuth } from '../../middlewares/authMiddleware.js';

router.post('/', optionalAuth, createCustomerReview);
router.get('/product/:productId', getProductReviews);

export default router;
