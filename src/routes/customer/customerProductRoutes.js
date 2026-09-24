import express from 'express';
const router = express.Router();
import { getCustomerProducts,
  getFeaturedProducts,
  getProductBySlugOrId, } from '../../controllers/customer/customerProductController.js';

router.get('/', getCustomerProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:idOrSlug', getProductBySlugOrId);

export default router;
