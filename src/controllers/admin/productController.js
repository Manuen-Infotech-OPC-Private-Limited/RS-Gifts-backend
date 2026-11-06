import Product from '../../models/Product.js';

// @desc    Get all products (Admin view with filtering and search)
// @route   GET /api/admin/products
// @access  Private (Admin)
const getProducts = async (req, res) => {
  try {
    const { category, occasion, search, lowStock, outOfStock, sort } = req.query;
    const filter = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (occasion && occasion !== 'ALL') {
      filter.occasions = occasion;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (outOfStock === 'true') {
      filter.stock = 0;
    }

    let query = Product.find(filter);

    // Sorting
    if (sort === 'price_asc') {
      query = query.sort({ price: 1 });
    } else if (sort === 'price_desc') {
      query = query.sort({ price: -1 });
    } else if (sort === 'stock_low') {
      query = query.sort({ stock: 1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    let products = await query;

    if (lowStock === 'true') {
      products = products.filter(
        (p) => p.stock <= (p.lowStockThreshold || 5) && p.stock > 0
      );
    }

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

// @desc    Get product by ID
// @route   GET /api/admin/products/:id
// @access  Private (Admin)
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new Product
// @route   POST /api/admin/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    const {
      title,
      productId,
      sku,
      description,
      category,
      occasions,
      price,
      salePrice,
      stock,
      lowStockThreshold,
      image,
      gallery,
      active,
      featured,
      personalization,
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({
        success: false,
        message: 'Product title and price are required',
      });
    }

    // Auto-generate or assign a guaranteed unique 6-digit Product ID (100001 - 999999)
    let assignedProductId = (productId || sku || '').trim().replace(/\D/g, '');
    if (assignedProductId.length > 6) {
      assignedProductId = assignedProductId.slice(-6);
    }

    const allExisting = await Product.find({}, 'productId sku').lean();
    const usedIds = new Set(
      allExisting
        .flatMap(p => [p.productId, p.sku])
        .filter(id => id && /^\d{6}$/.test(String(id).trim()))
        .map(id => String(id).trim())
    );

    if (assignedProductId.length !== 6 || usedIds.has(assignedProductId)) {
      let nextNum = 100001;
      while (usedIds.has(String(nextNum))) {
        nextNum++;
      }
      assignedProductId = String(nextNum);
    }

    // Auto-generate slug if not provided
    const productSlug = (req.body.slug && req.body.slug.trim() !== '')
      ? req.body.slug.trim().toLowerCase()
      : title.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

    const newProduct = await Product.create({
      title: title.trim(),
      slug: productSlug,
      productId: assignedProductId,
      sku: assignedProductId,
      description: description || '',
      category: category || 'Gifts',
      occasions: occasions || [],
      targetPages: Array.isArray(req.body.targetPages)
        ? req.body.targetPages
        : (req.body.targetPage ? [req.body.targetPage] : (category ? [category] : [])),
      targetPage: req.body.targetPage || (Array.isArray(req.body.targetPages) && req.body.targetPages[0]) || category || '',
      price: Number(price),
      salePrice: salePrice !== undefined && salePrice !== '' ? Number(salePrice) : Number(price),
      stock: stock !== undefined ? Number(stock) : 0,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
      image: image || (Array.isArray(gallery) && gallery[0]) || '',
      gallery: Array.isArray(gallery) && gallery.length > 0 ? gallery.filter(Boolean) : (image ? [image] : []),
      active: active !== undefined ? Boolean(active) : true,
      featured: featured !== undefined ? Boolean(featured) : false,
      rating: req.body.rating !== undefined ? Number(req.body.rating) : 5,
      ratings: {
        average: req.body.rating !== undefined ? Number(req.body.rating) : 5,
        count: req.body.reviews !== undefined ? Number(req.body.reviews) : 0,
      },
      personalization: personalization || {
        allowCustomText: false,
        customTextLabel: '',
        allowPhotoUpload: false,
        photoUploadRequired: false,
        allowGiftWrap: false,
        allowGreetingCard: false,
      },
      experienceTitle: req.body.experienceTitle || 'The RS Gifts Experience',
      experienceText: req.body.experienceText || '',
      inTheBox: req.body.inTheBox || '',
      specifications: req.body.specifications || {},
      shippingDetails: req.body.shippingDetails || {},
    });

    res.status(201).json({
      success: true,
      message: `Gift "${newProduct.title}" created successfully!`,
      product: newProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update an existing Product
// @route   PUT /api/admin/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Auto-assign next unique 6-digit ID if collision or empty
    let incomingId = (req.body.productId || req.body.sku || product.productId || product.sku || '').trim().replace(/\D/g, '');
    if (incomingId.length > 6) {
      incomingId = incomingId.slice(-6);
    }

    const otherExisting = await Product.find({ _id: { $ne: product._id } }, 'productId sku').lean();
    const usedIds = new Set(
      otherExisting
        .flatMap(p => [p.productId, p.sku])
        .filter(id => id && /^\d{6}$/.test(String(id).trim()))
        .map(id => String(id).trim())
    );

    if (incomingId.length !== 6 || usedIds.has(incomingId)) {
      let nextNum = 100001;
      while (usedIds.has(String(nextNum))) {
        nextNum++;
      }
      incomingId = String(nextNum);
    }

    // Prepare update object
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;

    updateData.productId = incomingId;
    updateData.sku = incomingId;
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.salePrice !== undefined) {
      updateData.salePrice = updateData.salePrice !== '' ? Number(updateData.salePrice) : updateData.price;
    }
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
    if (updateData.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = Number(updateData.lowStockThreshold);
    }
    if (updateData.rating !== undefined) {
      const parsedR = Number(updateData.rating);
      updateData.rating = parsedR;
      if (updateData.ratings && typeof updateData.ratings === 'object') {
        updateData.ratings = {
          ...updateData.ratings,
          average: parsedR
        };
      } else {
        updateData.ratings = {
          average: parsedR,
          count: product.ratings?.count || 0
        };
      }
    }

    // Auto-generate updated slug if title changes and no new slug is provided
    if (updateData.title && !updateData.slug && updateData.title.trim() !== product.title) {
      updateData.slug = updateData.title.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
    }

    if (updateData.gallery !== undefined || updateData.image !== undefined) {
      const existingGal = Array.isArray(updateData.gallery) ? updateData.gallery.filter(Boolean) : (Array.isArray(product.gallery) ? product.gallery.filter(Boolean) : []);
      const primaryImg = updateData.image || existingGal[0] || product.image || '';
      const finalGal = existingGal.includes(primaryImg) ? existingGal : (primaryImg ? [primaryImg, ...existingGal] : []);
      updateData.image = primaryImg;
      updateData.gallery = finalGal;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: `Product "${updated.title}" updated successfully`,
      product: updated,
    });
  } catch (error) {
    if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
      try {
        const others = await Product.find({ _id: { $ne: req.params.id } }, 'productId sku').lean();
        const used = new Set(others.flatMap(p => [p.productId, p.sku]).filter(Boolean));
        let nextN = 100001;
        while (used.has(String(nextN))) nextN++;
        const fixed = await Product.findByIdAndUpdate(
          req.params.id,
          { $set: { ...req.body, productId: String(nextN), sku: String(nextN) } },
          { new: true, runValidators: true }
        );
        return res.status(200).json({
          success: true,
          message: `Product updated successfully with unique ID ${nextN}`,
          product: fixed,
        });
      } catch (retryErr) { }
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete Product
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Product "${product.title}" has been deleted`,
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle Product Active Status
// @route   PATCH /api/admin/products/:id/toggle-active
// @access  Private (Admin)
const toggleProductActive = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.active = !product.active;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product is now ${product.active ? 'Active' : 'Draft'}`,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle Product Featured Status
// @route   PATCH /api/admin/products/:id/toggle-featured
// @access  Private (Admin)
const toggleProductFeatured = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.featured = !product.featured;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${product.featured ? 'marked as Featured' : 'removed from Featured'}`,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Quick Stock Update (Inventory Module)
// @route   PATCH /api/admin/products/:id/stock
// @access  Private (Admin)
const updateProductStock = async (req, res) => {
  try {
    const { stock, delta } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (stock !== undefined) {
      product.stock = Math.max(0, Number(stock));
    } else if (delta !== undefined) {
      product.stock = Math.max(0, product.stock + Number(delta));
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: `Stock updated for "${product.title}" (${product.stock} units)`,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
  updateProductStock,
};
