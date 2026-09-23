const express = require('express');
const router = express.Router();
const {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
} = require('../../controllers/admin/bannerController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.route('/')
  .get(getBanners)
  .post(createBanner);

router.route('/:id')
  .put(updateBanner)
  .delete(deleteBanner);

router.patch('/:id/toggle-active', toggleBannerActive);

module.exports = router;
