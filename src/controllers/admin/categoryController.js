import Category from '../../models/Category.js';

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
    const { name, description, image, active } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category with name "${name}" already exists`,
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
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const { name, description, image, active } = req.body;

    if (name && name.trim() !== category.name) {
      category.name = name.trim();
      category.slug = name
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
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" deleted successfully`,
      deletedId: req.params.id,
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
    const category = await Category.findById(req.params.id);
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
