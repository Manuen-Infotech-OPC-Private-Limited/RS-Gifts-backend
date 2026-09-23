const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
  updateProductStock,
} = require('../../controllers/admin/productController');
const { protect, adminOnly } = require('../../middlewares/authMiddleware');

router.use(protect, adminOnly);

router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

router.patch('/:id/toggle-active', toggleProductActive);
router.patch('/:id/toggle-featured', toggleProductFeatured);
router.patch('/:id/stock', updateProductStock);

module.exports = router;
