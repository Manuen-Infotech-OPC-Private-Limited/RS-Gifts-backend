const Review = require('../../models/Review');
const Product = require('../../models/Product');

// @desc    Submit a review for a gift
// @route   POST /api/customer/reviews
// @access  Public (Optional Customer auth)
const createCustomerReview = async (req, res) => {
  try {
    const { productId, rating, comment, customerName, customerEmail } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating (1-5), and review comment are required',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const name = req.user ? req.user.name : (customerName || 'Verified Buyer');
    const email = req.user ? req.user.email : (customerEmail || '');

    const review = await Review.create({
      product: product._id,
      customer: req.user ? req.user._id : null,
      customerName: name,
      customerEmail: email,
      rating: Number(rating),
      comment: comment.trim(),
      isApproved: true, // Default to approved or moderation queue
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted.',
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get approved reviews for a product
// @route   GET /api/customer/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      isApproved: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createCustomerReview,
  getProductReviews,
};
