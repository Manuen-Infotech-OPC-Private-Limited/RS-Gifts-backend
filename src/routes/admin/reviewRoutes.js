import express from 'express';
const router = express.Router();
import {
  getReviews,
  createReview,
  updateReview,
  toggleApproveReview,
  replyToReview,
  deleteReview,
} from '../../controllers/admin/reviewController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.get('/', getReviews);
router.post('/', createReview);
router.put('/:id', updateReview);
router.patch('/:id/toggle-approve', toggleApproveReview);
router.patch('/:id/reply', replyToReview);
router.delete('/:id', deleteReview);

export default router;
