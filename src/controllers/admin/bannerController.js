import Banner from '../../models/Banner.js';

// @desc    Get all banners
// @route   GET /api/admin/content/banners
// @access  Private (Admin)
const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new promotional banner
// @route   POST /api/admin/content/banners
// @access  Private (Admin)
const createBanner = async (req, res) => {
  try {
    const { tagline, title, subtitle, image, link, position, order, active, buttonText } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required',
      });
    }

    const banner = await Banner.create({
      tagline: tagline ? tagline.trim() : '',
      title: title || '',
      subtitle: subtitle || '',
      image,
      link: link || '',
      buttonText: buttonText || 'Shop Now',
      position: position || 'hero',
      order: order ? Number(order) : 0,
      active: active !== undefined ? Boolean(active) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update banner
// @route   PUT /api/admin/content/banners/:id
// @access  Private (Admin)
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    const { tagline, title, subtitle, image, link, position, order, active, buttonText } = req.body;

    if (tagline !== undefined) banner.tagline = tagline ? tagline.trim() : '';
    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (image !== undefined) banner.image = image;
    if (link !== undefined) banner.link = link;
    if (buttonText !== undefined) banner.buttonText = buttonText;
    if (position !== undefined) banner.position = position;
    if (order !== undefined) banner.order = Number(order);
    if (active !== undefined) banner.active = Boolean(active);

    const updated = await banner.save();

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      banner: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete banner
// @route   DELETE /api/admin/content/banners/:id
// @access  Private (Admin)
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    await Banner.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle banner active status
// @route   PATCH /api/admin/content/banners/:id/toggle-active
// @access  Private (Admin)
const toggleBannerActive = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    banner.active = !banner.active;
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner is now ${banner.active ? 'Visible' : 'Hidden'}`,
      banner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
};
