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
      .populate('product', 'title sku image')
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

    review.isApproved = !review.isApproved;
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

export {
  getReviews,
  toggleApproveReview,
  replyToReview,
  deleteReview,
};
