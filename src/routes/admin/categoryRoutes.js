const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
} = require('../../controllers/admin/categoryController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.route('/')
  .get(getCategories)
  .post(createCategory);

router.route('/:id')
  .put(updateCategory)
  .delete(deleteCategory);

router.patch('/:id/toggle-active', toggleCategoryActive);

module.exports = router;
