const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
} = require('../../controllers/admin/settingController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
