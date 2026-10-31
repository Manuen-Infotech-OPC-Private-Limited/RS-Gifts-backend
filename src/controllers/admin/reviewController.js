import Review from '../../models/Review.js';
import { updateProductAverageRating } from '../customer/customerReviewController.js';

// @desc    Get all reviews for moderation
// @route   GET /api/admin/reviews
// @access  Private (Admin)
const getReviews = async (req, res) => {
  try {
    const { status, rating } = req.query;
    const filter = {};

    if (status === 'approved') filter.isApproved = true;
    if (status === 'pending') filter.isApproved = false;
    if (rating) filter.rating = Number(rating);

    const reviews = await Review.find(filter)
      .populate('product', 'title productId sku image')
      .sort({ createdAt: -1 });

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

// @desc    Toggle review approval
// @route   PATCH /api/admin/reviews/:id/toggle-approve
// @access  Private (Admin)
const toggleApproveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (req.body && typeof req.body.isApproved === 'boolean') {
      review.isApproved = req.body.isApproved;
    } else {
      review.isApproved = !review.isApproved;
    }
    await review.save();

    // Recalculate average rating for the product
    await updateProductAverageRating(review.product);

    res.status(200).json({
      success: true,
      message: `Review is now ${review.isApproved ? 'Approved' : 'Unapproved'}`,
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add admin reply to review
// @route   PATCH /api/admin/reviews/:id/reply
// @access  Private (Admin)
const replyToReview = async (req, res) => {
  try {
    const { adminReply } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    review.adminReply = adminReply || '';
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Admin reply saved',
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin)
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    // Recalculate average rating for the product
    await updateProductAverageRating(review.product);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create review as Admin (Set customer review)
// @route   POST /api/admin/reviews
// @access  Private (Admin)
const createReview = async (req, res) => {
  try {
    const { productId, customerName, rating, comment, isApproved } = req.body;

    if (!productId || !customerName || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product, customer name, rating, and comment are required',
      });
    }

    let finalName = customerName.trim();
    if (!finalName || /^\s*rs\s*gifts?\s*$/i.test(finalName)) {
      finalName = 'Verified Customer';
    }

    const review = await Review.create({
      product: productId,
      customerName: finalName,
      rating: Number(rating) || 5,
      comment: comment.trim(),
      isApproved: isApproved !== undefined ? isApproved : true,
    });

    await updateProductAverageRating(productId);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update review (Customer name, rating, comment, status)
// @route   PUT /api/admin/reviews/:id
// @access  Private (Admin)
const updateReview = async (req, res) => {
  try {
    const { customerName, rating, comment, isApproved } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (customerName) {
      let finalName = customerName.trim();
      if (!finalName || /^\s*rs\s*gifts?\s*$/i.test(finalName)) {
        finalName = 'Verified Customer';
      }
      review.customerName = finalName;
    }
    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment.trim();
    if (isApproved !== undefined) review.isApproved = isApproved;

    await review.save();
    await updateProductAverageRating(review.product);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getReviews,
  createReview,
  updateReview,
  toggleApproveReview,
  replyToReview,
  deleteReview,
};
