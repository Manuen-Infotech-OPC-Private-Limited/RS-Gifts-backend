import express from 'express';
const router = express.Router();
import { createInquiry } from '../../controllers/customer/customerInquiryController.js';

router.post('/', createInquiry);

export default router;
