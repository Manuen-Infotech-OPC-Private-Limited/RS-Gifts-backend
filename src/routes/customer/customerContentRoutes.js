import express from 'express';
const router = express.Router();
import { getActiveBanners,
  getActiveCategories,
  getActiveOccasions,
  getPublicSettings, } from '../../controllers/customer/customerContentController.js';

router.get('/banners', getActiveBanners);
router.get('/categories', getActiveCategories);
router.get('/occasions', getActiveOccasions);
router.get('/settings', getPublicSettings);

export default router;
