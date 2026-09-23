const express = require('express');
const router = express.Router();
const {
  createCustomerReview,
  getProductReviews,
} = require('../../controllers/customer/customerReviewController');
const { optionalAuth } = require('../../middlewares/authMiddleware');

router.post('/', optionalAuth, createCustomerReview);
router.get('/product/:productId', getProductReviews);

module.exports = router;
