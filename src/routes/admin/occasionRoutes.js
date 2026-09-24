import express from 'express';
const router = express.Router();
import { getOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion, } from '../../controllers/admin/occasionController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.route('/')
  .get(getOccasions)
  .post(createOccasion);

router.route('/:id')
  .put(updateOccasion)
  .delete(deleteOccasion);

export default router;
