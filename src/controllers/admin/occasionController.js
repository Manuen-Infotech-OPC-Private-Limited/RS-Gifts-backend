const Occasion = require('../../models/Occasion');

// @desc    Get all occasions
// @route   GET /api/admin/occasions
// @access  Private (Admin)
const getOccasions = async (req, res) => {
  try {
    const occasions = await Occasion.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: occasions.length,
      occasions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new occasion
// @route   POST /api/admin/occasions
// @access  Private (Admin)
const createOccasion = async (req, res) => {
  try {
    const { name, description, active } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Occasion name is required',
      });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    const existing = await Occasion.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Occasion "${name}" already exists`,
      });
    }

    const occasion = await Occasion.create({
      name: name.trim(),
      slug,
      description: description || '',
      active: active !== undefined ? Boolean(active) : true,
    });

    res.status(201).json({
      success: true,
      message: `Occasion "${occasion.name}" created successfully`,
      occasion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update occasion
// @route   PUT /api/admin/occasions/:id
// @access  Private (Admin)
const updateOccasion = async (req, res) => {
  try {
    const occasion = await Occasion.findById(req.params.id);
    if (!occasion) {
      return res.status(404).json({
        success: false,
        message: 'Occasion not found',
      });
    }

    const { name, description, active } = req.body;

    if (name && name.trim() !== occasion.name) {
      occasion.name = name.trim();
      occasion.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }

    if (description !== undefined) occasion.description = description;
    if (active !== undefined) occasion.active = Boolean(active);

    const updated = await occasion.save();

    res.status(200).json({
      success: true,
      message: `Occasion "${updated.name}" updated successfully`,
      occasion: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete occasion
// @route   DELETE /api/admin/occasions/:id
// @access  Private (Admin)
const deleteOccasion = async (req, res) => {
  try {
    const occasion = await Occasion.findById(req.params.id);
    if (!occasion) {
      return res.status(404).json({
        success: false,
        message: 'Occasion not found',
      });
    }

    await Occasion.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Occasion "${occasion.name}" deleted successfully`,
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion,
};
