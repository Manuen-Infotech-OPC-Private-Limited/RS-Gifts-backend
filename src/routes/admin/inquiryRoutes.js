import express from 'express';
const router = express.Router();
import {
  getInquiries,
  updateInquiryStatus,
  deleteInquiry,
} from '../../controllers/admin/inquiryController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.get('/', getInquiries);
router.patch('/:id/status', updateInquiryStatus);
router.delete('/:id', deleteInquiry);

export default router;
