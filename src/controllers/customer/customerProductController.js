const Product = require('../../models/Product');
const Review = require('../../models/Review');

// @desc    Get active public products with filtering, search, and sorting
// @route   GET /api/customer/products
// @access  Public
const getCustomerProducts = async (req, res) => {
  try {
    const { category, occasion, search, minPrice, maxPrice, inStock, sort, page = 1, limit = 20 } = req.query;

    const filter = { active: true };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (occasion && occasion !== 'ALL') {
      filter.occasions = occasion;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    let query = Product.find(filter);

    // Sorting options
    if (sort === 'price_asc') {
      query = query.sort({ price: 1 });
    } else if (sort === 'price_desc') {
      query = query.sort({ price: -1 });
    } else if (sort === 'rating') {
      query = query.sort({ 'ratings.average': -1 });
    } else if (sort === 'featured') {
      query = query.sort({ featured: -1, createdAt: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(filter);
    const products = await query.skip(skip).limit(limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get featured gifts
// @route   GET /api/customer/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ active: true, featured: true })
      .sort({ createdAt: -1 })
      .limit(8);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single product by ID or Slug with approved reviews
// @route   GET /api/customer/products/:idOrSlug
// @access  Public
const getProductBySlugOrId = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let product;

    // Check if valid ObjectId or search by slug
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findOne({ _id: idOrSlug, active: true });
    } else {
      product = await Product.findOne({ slug: idOrSlug, active: true });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or currently unavailable',
      });
    }

    // Fetch approved customer reviews
    const reviews = await Review.find({ product: product._id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20);

    // Fetch related products in same category
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      active: true,
    }).limit(4);

    res.status(200).json({
      success: true,
      product,
      reviews,
      relatedProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getCustomerProducts,
  getFeaturedProducts,
  getProductBySlugOrId,
};
