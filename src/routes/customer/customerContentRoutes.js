const express = require('express');
const router = express.Router();
const {
  getActiveBanners,
  getActiveCategories,
  getActiveOccasions,
  getPublicSettings,
} = require('../../controllers/customer/customerContentController');

router.get('/banners', getActiveBanners);
router.get('/categories', getActiveCategories);
router.get('/occasions', getActiveOccasions);
router.get('/settings', getPublicSettings);

module.exports = router;
