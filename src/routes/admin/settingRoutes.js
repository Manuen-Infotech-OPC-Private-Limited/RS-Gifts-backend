import express from 'express';
const router = express.Router();
import { getSettings,
  updateSettings, } from '../../controllers/admin/settingController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

export default router;
