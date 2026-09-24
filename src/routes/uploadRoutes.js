import express from 'express';
const router = express.Router();
import upload from '../middlewares/uploadMiddleware.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import Setting from '../models/Setting.js';

// @desc    Upload a single image (Hybrid: Cloudinary or Local)
// @route   POST /api/upload
// @access  Public / Admin
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    const setting = await Setting.findOne();
    const hasCloudinary =
      (setting && setting.cloudinaryCloudName && process.env.CLOUDINARY_API_KEY) ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

    if (hasCloudinary) {
      try {
        const cloudResult = await uploadToCloudinary(req.file.path, 'rs_gifts/products');
        return res.status(200).json({
          success: true,
          url: cloudResult.url,
          public_id: cloudResult.public_id,
          format: cloudResult.format,
          provider: 'cloudinary',
        });
      } catch (cloudErr) {
        console.warn('Cloudinary upload fallback to local static:', cloudErr.message);
      }
    }

    // Return static server URL
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      provider: 'local',
      message: 'Image uploaded locally',
    });
  } catch (error) {
    console.error('File upload failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'File upload error',
    });
  }
});

// @desc    Upload multiple images (Gallery)
// @route   POST /api/upload/multiple
// @access  Public / Admin
router.post('/multiple', upload.array('images', 8), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided for upload',
      });
    }

    const host = req.get('host');
    const protocol = req.protocol;

    const urls = req.files.map((file) => `${protocol}://${host}/uploads/${file.filename}`);

    res.status(200).json({
      success: true,
      count: urls.length,
      urls,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files',
    });
  }
});

export default router;
