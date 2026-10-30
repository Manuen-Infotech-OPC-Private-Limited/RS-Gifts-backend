import mongoose from 'mongoose';
import Category from '../../models/Category.js';

// Helper to find category by ObjectId, slug, or name
const findCategory = async (idOrSlug, fallbackName = null) => {
  if (!idOrSlug) return null;
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    const byId = await Category.findById(idOrSlug);
    if (byId) return byId;
  }
  const clean = String(idOrSlug).trim().toLowerCase();
  const slugified = clean.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  let cat = await Category.findOne({
    $or: [
      { slug: clean },
      { slug: slugified },
      { name: new RegExp(`^${clean}$`, 'i') },
      { name: new RegExp(`^${String(idOrSlug).trim()}$`, 'i') }
    ]
  });

  if (!cat && fallbackName) {
    const nameClean = String(fallbackName).trim();
    const nameSlug = nameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    cat = await Category.findOne({
      $or: [
        { slug: nameSlug },
        { name: new RegExp(`^${nameClean}$`, 'i') }
      ]
    });
  }
  return cat;
};

// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Private (Admin)
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new category
// @route   POST /api/admin/categories
// @access  Private (Admin)
const createCategory = async (req, res) => {
  try {
    const { name, description, image, active, slug: customSlug } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const slug = (customSlug || name)
      .toLowerCase()
      .trim()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    const existing = await findCategory(slug, name);
    if (existing) {
      existing.name = name.trim();
      if (description !== undefined) existing.description = description;
      if (image !== undefined) existing.image = image;
      if (active !== undefined) existing.active = Boolean(active);
      await existing.save();

      return res.status(200).json({
        success: true,
        message: `Category "${existing.name}" updated successfully`,
        category: existing,
      });
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description || '',
      image: image || '',
      active: active !== undefined ? Boolean(active) : true,
    });

    res.status(201).json({
      success: true,
      message: `Category "${category.name}" created successfully`,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private (Admin)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, active, slug: customSlug } = req.body;

    let category = await findCategory(id, name);

    if (!category) {
      if (name && name.trim()) {
        const slug = (customSlug || name)
          .toLowerCase()
          .trim()
          .replace(/[^\w ]+/g, '')
          .replace(/ +/g, '-');

        category = await Category.create({
          name: name.trim(),
          slug,
          description: description || '',
          image: image || '',
          active: active !== undefined ? Boolean(active) : true,
        });

        return res.status(200).json({
          success: true,
          message: `Category "${category.name}" created successfully`,
          category,
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (name && name.trim() !== category.name) {
      category.name = name.trim();
      category.slug = (customSlug || name)
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (active !== undefined) category.active = Boolean(active);

    const updated = await category.save();

    res.status(200).json({
      success: true,
      message: `Category "${updated.name}" updated successfully`,
      category: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private (Admin)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await findCategory(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    await Category.findByIdAndDelete(category._id);

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" deleted successfully`,
      deletedId: category._id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle category active status
// @route   PATCH /api/admin/categories/:id/toggle-active
// @access  Private (Admin)
const toggleCategoryActive = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await findCategory(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    category.active = !category.active;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" is now ${category.active ? 'Active' : 'Hidden'}`,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
};
