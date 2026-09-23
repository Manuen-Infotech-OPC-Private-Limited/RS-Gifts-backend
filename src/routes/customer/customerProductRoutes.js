const express = require('express');
const router = express.Router();
const {
  getCustomerProducts,
  getFeaturedProducts,
  getProductBySlugOrId,
} = require('../../controllers/customer/customerProductController');

router.get('/', getCustomerProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:idOrSlug', getProductBySlugOrId);

module.exports = router;
