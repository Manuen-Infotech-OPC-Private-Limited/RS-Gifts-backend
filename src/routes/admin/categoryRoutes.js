import express from 'express';
const router = express.Router();
import { getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive, } from '../../controllers/admin/categoryController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

router.use(protect, adminOnly);

router.route('/')
  .get(getCategories)
  .post(createCategory);

router.route('/:id')
  .put(updateCategory)
  .delete(deleteCategory);

router.patch('/:id/toggle-active', toggleCategoryActive);

export default router;
