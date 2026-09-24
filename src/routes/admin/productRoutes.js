import express from 'express';
const router = express.Router();
import { getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
  updateProductStock, } from '../../controllers/admin/productController.js';
import { protect, adminOnly } from '../../middlewares/authMiddleware.js';

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

export default router;
