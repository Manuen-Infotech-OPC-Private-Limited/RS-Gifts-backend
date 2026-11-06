import Product from '../../models/Product.js';
import Review from '../../models/Review.js';
import Coupon from '../../models/Coupon.js';

// Helper to retrieve currently active storewide promotional discount
const getActiveStoreDiscount = async () => {
  try {
    const now = new Date();
    const coupon = await Coupon.findOne({
      active: true,
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: now } },
      ],
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (!coupon) return null;
    const isFlat = coupon.discountType === 'flat' || coupon.discountType === 'fixed';
    return {
      code: coupon.code,
      discountType: isFlat ? 'flat' : 'percentage',
      discountValue: coupon.discountValue,
      label: isFlat ? `₹${coupon.discountValue} OFF` : `${coupon.discountValue}% OFF`,
      minOrderValue: coupon.minOrderValue || 0,
    };
  } catch {
    return null;
  }
};

// @desc    Get active public products with filtering, search, and sorting
// @route   GET /api/customer/products
// @access  Public
const getCustomerProducts = async (req, res) => {
  try {
    const { category, occasion, targetPage, search, minPrice, maxPrice, inStock, sort, page = 1, limit = 50, featured } = req.query;

    const filter = { active: true };

    if (featured === 'true' || featured === true) {
      filter.featured = true;
    }

    if (targetPage && targetPage !== 'ALL') {
      const cleanTarget = targetPage.replace(/[-_]/g, ' ').trim();
      const escapedTarget = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const targetRegex = new RegExp(`^${escapedTarget}$`, 'i');
      filter.$or = [
        { targetPages: { $elemMatch: { $regex: targetRegex } } },
        { targetPage: { $regex: targetRegex } },
        { category: { $regex: targetRegex } },
      ];
    } else if (category && category !== 'ALL') {
      const cleanCat = category.replace(/[-_]/g, ' ').trim();
      const escapedCat = cleanCat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const catRegex = new RegExp(`^${escapedCat}$`, 'i');
      filter.$or = [
        { targetPages: { $elemMatch: { $regex: catRegex } } },
        { targetPage: { $regex: catRegex } },
        { category: { $regex: catRegex } },
      ];
    }

    if (occasion && occasion !== 'ALL') {
      const cleanOcc = occasion.replace(/[-_]/g, ' ').trim();
      const escapedOcc = cleanOcc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.occasions = { $elemMatch: { $regex: new RegExp(`^${escapedOcc}$`, 'i') } };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    if (search && String(search).trim()) {
      const rawSearch = String(search).trim();
      const escapedFull = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Tokenize terms: split by spaces and punctuation
      const tokens = rawSearch
        .split(/[\s,+/_-]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Create singular/plural regex for each token
      const tokenRegexes = tokens.map((t) => {
        let base = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (base.toLowerCase().endsWith('ies') && base.length > 4) {
          base = base.slice(0, -3) + '(y|ies)';
        } else if (base.toLowerCase().endsWith('es') && base.length > 3) {
          base = base.slice(0, -2) + '(es)?';
        } else if (base.toLowerCase().endsWith('s') && base.length > 2) {
          base = base.slice(0, -1) + 's?';
        } else {
          base = `${base}s?`;
        }
        return new RegExp(base, 'i');
      });

      // Search fields criteria
      const searchConditions = [
        { title: { $regex: escapedFull, $options: 'i' } },
        { description: { $regex: escapedFull, $options: 'i' } },
        { category: { $regex: escapedFull, $options: 'i' } },
        { targetPage: { $regex: escapedFull, $options: 'i' } },
        { targetPages: { $elemMatch: { $regex: escapedFull, $options: 'i' } } },
        { categories: { $elemMatch: { $regex: escapedFull, $options: 'i' } } },
        { occasions: { $elemMatch: { $regex: escapedFull, $options: 'i' } } },
        { sku: { $regex: escapedFull, $options: 'i' } },
        { productId: { $regex: escapedFull, $options: 'i' } },
      ];

      // Add individual token matches for every token
      tokenRegexes.forEach((reg) => {
        searchConditions.push(
          { title: { $regex: reg } },
          { category: { $regex: reg } },
          { description: { $regex: reg } },
          { targetPage: { $regex: reg } },
          { targetPages: { $elemMatch: { $regex: reg } } },
          { categories: { $elemMatch: { $regex: reg } } },
          { occasions: { $elemMatch: { $regex: reg } } }
        );
      });

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions },
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
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
    const activeDiscount = await getActiveStoreDiscount();

    const formattedProducts = products.map((prod) => {
      const p = prod.toObject ? prod.toObject() : { ...prod };
      p.rating = Number(p.rating !== undefined ? p.rating : (p.ratings?.average !== undefined ? p.ratings.average : 5));
      p.reviews = Number(p.ratings?.count !== undefined ? p.ratings.count : (p.reviews !== undefined ? p.reviews : 0));
      const actualPrice = p.salePrice || p.price || 0;
      p.price = actualPrice;
      p.salePrice = actualPrice;
      p.originalPrice = actualPrice;
      p.discount = '';
      return p;
    });

    if (search && String(search).trim() && (!sort || sort === 'featured' || sort === 'relevance')) {
      const lowerQ = String(search).toLowerCase().trim();
      formattedProducts.sort((a, b) => {
        const aTitle = (a.title || a.name || '').toLowerCase();
        const bTitle = (b.title || b.name || '').toLowerCase();
        const aCat = (a.category || '').toLowerCase();
        const bCat = (b.category || '').toLowerCase();

        const aExact = aTitle === lowerQ ? 100 : 0;
        const bExact = bTitle === lowerQ ? 100 : 0;
        if (aExact !== bExact) return bExact - aExact;

        const aStarts = aTitle.startsWith(lowerQ) ? 50 : 0;
        const bStarts = bTitle.startsWith(lowerQ) ? 50 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;

        const aContains = aTitle.includes(lowerQ) ? 30 : 0;
        const bContains = bTitle.includes(lowerQ) ? 30 : 0;
        if (aContains !== bContains) return bContains - aContains;

        const aCatMatch = aCat.includes(lowerQ) ? 20 : 0;
        const bCatMatch = bCat.includes(lowerQ) ? 20 : 0;
        if (aCatMatch !== bCatMatch) return bCatMatch - aCatMatch;

        return 0;
      });
    }

    res.status(200).json({
      success: true,
      count: formattedProducts.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      activeCoupon: activeDiscount,
      discountDisplay: activeDiscount?.label || '',
      products: formattedProducts,
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

    const activeDiscount = await getActiveStoreDiscount();

    const formattedProducts = products.map((prod) => {
      const p = prod.toObject ? prod.toObject() : { ...prod };
      p.rating = Number(p.rating !== undefined ? p.rating : (p.ratings?.average !== undefined ? p.ratings.average : 5));
      p.reviews = Number(p.ratings?.count !== undefined ? p.ratings.count : (p.reviews !== undefined ? p.reviews : 0));
      const actualPrice = p.salePrice || p.price || 0;
      p.price = actualPrice;
      p.salePrice = actualPrice;
      p.originalPrice = actualPrice;
      p.discount = '';
      return p;
    });

    res.status(200).json({
      success: true,
      count: formattedProducts.length,
      activeCoupon: activeDiscount,
      discountDisplay: activeDiscount?.label || '',
      products: formattedProducts,
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

export {
  getCustomerProducts,
  getFeaturedProducts,
  getProductBySlugOrId,
};
