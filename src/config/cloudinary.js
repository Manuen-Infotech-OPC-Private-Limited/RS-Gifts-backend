const cloudinary = require('cloudinary').v2;

const configureCloudinary = (customConfig = null) => {
  if (customConfig && customConfig.cloudName && customConfig.apiKey && customConfig.apiSecret) {
    cloudinary.config({
      cloud_name: customConfig.cloudName,
      api_key: customConfig.apiKey,
      api_secret: customConfig.apiSecret,
    });
    return cloudinary;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  });

  return cloudinary;
};

// Initial config
configureCloudinary();

module.exports = {
  cloudinary,
  configureCloudinary,
};
