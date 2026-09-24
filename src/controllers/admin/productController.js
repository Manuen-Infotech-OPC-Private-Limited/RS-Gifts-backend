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

    // Auto-generate SKU if not provided
    const productSku = sku && sku.trim() !== ''
      ? sku.trim().toUpperCase()
      : `RS-GIFT-${Date.now().toString().slice(-6)}`;

    // Check SKU collision
    const existingSku = await Product.findOne({ sku: productSku });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: `A product with SKU "${productSku}" already exists. Please provide a unique SKU.`,
      });
    }

    // Auto-generate slug if not provided
    const productSlug = (req.body.slug && req.body.slug.trim() !== '')
      ? req.body.slug.trim().toLowerCase()
      : title.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

    const newProduct = await Product.create({
      title: title.trim(),
      slug: productSlug,
      sku: productSku,
      description: description || '',
      category: category || 'Gifts',
      occasions: occasions || [],
      price: Number(price),
      salePrice: salePrice !== undefined && salePrice !== '' ? Number(salePrice) : Number(price),
      stock: stock !== undefined ? Number(stock) : 0,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
      image: image || '',
      gallery: gallery || [],
      active: active !== undefined ? Boolean(active) : true,
      featured: featured !== undefined ? Boolean(featured) : false,
      personalization: personalization || {
        allowCustomText: false,
        customTextLabel: '',
        allowPhotoUpload: false,
        photoUploadRequired: false,
        allowGiftWrap: false,
        allowGreetingCard: false,
      },
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

    // If SKU is changing, verify uniqueness
    if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
      const existing = await Product.findOne({ sku: req.body.sku.toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `SKU "${req.body.sku}" is already in use by another product`,
        });
      }
    }

    // Prepare update object
    const updateData = { ...req.body };
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.salePrice !== undefined) {
      updateData.salePrice = updateData.salePrice !== '' ? Number(updateData.salePrice) : updateData.price;
    }
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
    if (updateData.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = Number(updateData.lowStockThreshold);
    }
    if (updateData.sku) updateData.sku = updateData.sku.toUpperCase();

    // Auto-generate updated slug if title changes and no new slug is provided
    if (updateData.title && !updateData.slug && updateData.title.trim() !== product.title) {
      updateData.slug = updateData.title.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
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
