import Setting from '../../models/Setting.js';

// @desc    Get store settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update store settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    const {
      contactPhone,
      contactEmail,
      supportEmail, // backward compatibility
      storeAddress,
      supportHours,
      currencySymbol,
      standardShippingFee,
      freeShippingThreshold,
      cashOnDeliveryEnabled,
      cloudinaryCloudName,
      cloudinaryUploadPreset,
      adminName,
      adminEmail,
    } = req.body;

    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    else if (supportEmail !== undefined) settings.contactEmail = supportEmail;
    if (storeAddress !== undefined) settings.storeAddress = storeAddress;
    if (supportHours !== undefined) settings.supportHours = supportHours;
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;
    if (standardShippingFee !== undefined) settings.standardShippingFee = Number(standardShippingFee);
    if (freeShippingThreshold !== undefined) settings.freeShippingThreshold = Number(freeShippingThreshold);
    if (cashOnDeliveryEnabled !== undefined) settings.cashOnDeliveryEnabled = Boolean(cashOnDeliveryEnabled);
    if (cloudinaryCloudName !== undefined) settings.cloudinaryCloudName = cloudinaryCloudName;
    if (cloudinaryUploadPreset !== undefined) settings.cloudinaryUploadPreset = cloudinaryUploadPreset;
    if (adminName !== undefined) settings.adminName = adminName;
    if (adminEmail !== undefined) settings.adminEmail = adminEmail;

    const saved = await settings.save();

    res.status(200).json({
      success: true,
      message: 'Store settings saved successfully',
      settings: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getSettings,
  updateSettings,
};
