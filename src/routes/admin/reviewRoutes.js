import express from 'express';
const router = express.Router();
import { getReviews,
  toggleApproveReview,
  replyToReview,
  deleteReview, } from '../../controllers/admin/reviewController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.get('/', getReviews);
router.patch('/:id/toggle-approve', toggleApproveReview);
router.patch('/:id/reply', replyToReview);
router.delete('/:id', deleteReview);

export default router;
