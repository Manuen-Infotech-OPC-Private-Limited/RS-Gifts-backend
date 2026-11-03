import Banner from '../../models/Banner.js';
import Category from '../../models/Category.js';
import Occasion from '../../models/Occasion.js';
import Setting from '../../models/Setting.js';

// @desc    Get active promotional banners
// @route   GET /api/customer/content/banners
// @access  Public
const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ order: 1, createdAt: -1 });
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

// @desc    Get active categories
// @route   GET /api/customer/content/categories
// @access  Public
const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true }).sort({ name: 1 });
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

// @desc    Get active occasions
// @route   GET /api/customer/content/occasions
// @access  Public
const getActiveOccasions = async (req, res) => {
  try {
    const occasions = await Occasion.find({ active: true }).sort({ name: 1 });
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

// @desc    Get public store settings
// @route   GET /api/customer/content/settings
// @access  Public
const getPublicSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }

    res.status(200).json({
      success: true,
      settings: {
        storeLogo: settings.storeLogo || '',
        storeName: settings.storeName || 'RS GIFTS',
        contactPhone: settings.contactPhone || '',
        altContactPhone: settings.altContactPhone || '',
        contactEmail: settings.contactEmail || settings.supportEmail || '',
        altContactEmail: settings.altContactEmail || '',
        storeAddress: settings.storeAddress || '',
        supportHours: settings.supportHours || '',
        altSupportHours: settings.altSupportHours || '',
        googleMapUrl: settings.googleMapUrl || '',
        currencySymbol: settings.currencySymbol,
        standardShippingFee: settings.standardShippingFee,
        freeShippingThreshold: settings.freeShippingThreshold,
        cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
        facebookUrl: settings.facebookUrl || '',
        instagramUrl: settings.instagramUrl || '',
        youtubeUrl: settings.youtubeUrl || '',
        pinterestUrl: settings.pinterestUrl || '',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getActiveBanners,
  getActiveCategories,
  getActiveOccasions,
  getPublicSettings,
};
