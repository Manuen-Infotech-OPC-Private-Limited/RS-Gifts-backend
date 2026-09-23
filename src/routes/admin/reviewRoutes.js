const express = require('express');
const router = express.Router();
const {
  getReviews,
  toggleApproveReview,
  replyToReview,
  deleteReview,
} = require('../../controllers/admin/reviewController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.get('/', getReviews);
router.patch('/:id/toggle-approve', toggleApproveReview);
router.patch('/:id/reply', replyToReview);
router.delete('/:id', deleteReview);

module.exports = router;
