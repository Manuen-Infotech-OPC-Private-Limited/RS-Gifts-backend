import mongoose from 'mongoose';
import Review from '../../models/Review.js';
import Product from '../../models/Product.js';

// Calculate and update product average rating
const updateProductAverageRating = async (productId) => {
  try {
    if (!productId) return;
    const targetId = mongoose.Types.ObjectId.isValid(productId)
      ? new mongoose.Types.ObjectId(productId)
      : productId;

    const stats = await Review.aggregate([
      { $match: { product: targetId, isApproved: true } },
      {
        $group: {
          _id: '$product',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      const avg = Math.round(stats[0].avgRating * 10) / 10;
      await Product.findByIdAndUpdate(targetId, {
        rating: avg,
        'ratings.average': avg,
        'ratings.count': stats[0].count,
      });
    } else {
      await Product.findByIdAndUpdate(targetId, {
        rating: 0,
        'ratings.average': 0,
        'ratings.count': 0,
      });
    }
  } catch (error) {
    console.error('Error recalculating product average rating:', error);
  }
};

// @desc    Submit a review for a gift
// @route   POST /api/customer/reviews
// @access  Public (Optional Customer auth)
const createCustomerReview = async (req, res) => {
  try {
    const { productId, rating, comment, customerName, customerEmail } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and rating (1-5) are required',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    let name = customerName?.trim();
    if (!name || /^\s*rs\s*gifts?\s*$/i.test(name)) {
      if (req.user && req.user.name && !/^\s*rs\s*gifts?\s*$/i.test(req.user.name)) {
        name = req.user.name.trim();
      } else {
        name = 'Verified Customer';
      }
    }
    const email = req.user ? req.user.email : (customerEmail || '');

    const review = await Review.create({
      product: product._id,
      customer: req.user ? req.user._id : null,
      customerName: name,
      customerEmail: email,
      rating: Number(rating),
      comment: comment ? comment.trim() : '',
      isApproved: true, // Visible by default on customer store
    });

    // Update product rating stats in controller
    await updateProductAverageRating(product._id);

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

export {
  createCustomerReview,
  getProductReviews,
  updateProductAverageRating,
};
