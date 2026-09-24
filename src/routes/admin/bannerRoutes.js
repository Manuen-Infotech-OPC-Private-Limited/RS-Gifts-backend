import express from 'express';
const router = express.Router();
import { getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive, } from '../../controllers/admin/bannerController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.route('/')
  .get(getBanners)
  .post(createBanner);

router.route('/:id')
  .put(updateBanner)
  .delete(deleteBanner);

router.patch('/:id/toggle-active', toggleBannerActive);

export default router;
