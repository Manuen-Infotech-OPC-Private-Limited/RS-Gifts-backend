const { cloudinary, configureCloudinary } = require('../config/cloudinary');
const Setting = require('../models/Setting');
const fs = require('fs');

const uploadToCloudinary = async (filePath, customFolder = 'rs_gifts') => {
  // Check if credentials exist in Settings or env
  const setting = await Setting.findOne();
  if (setting && setting.cloudinaryCloudName) {
    configureCloudinary({
      cloudName: setting.cloudinaryCloudName,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder: customFolder,
        resource_type: 'auto',
      },
      (error, result) => {
        // Clean up temporary local file if uploaded to Cloudinary
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupErr) {
          console.warn('Could not remove temporary upload file:', cleanupErr.message);
        }

        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
  });
};

module.exports = {
  uploadToCloudinary,
};
