import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  storeLogo: {
    type: String,
    default: '',
    trim: true,
  },
  storeName: {
    type: String,
    default: 'RS GIFTS',
    trim: true,
  },
  contactPhone: {
    type: String,
    default: '',
    trim: true,
  },
  altContactPhone: {
    type: String,
    default: '',
    trim: true,
  },
  contactEmail: {
    type: String,
    default: '',
    trim: true,
  },
  altContactEmail: {
    type: String,
    default: '',
    trim: true,
  },
  storeAddress: {
    type: String,
    default: '',
    trim: true,
  },
  supportHours: {
    type: String,
    default: '',
    trim: true,
  },
  altSupportHours: {
    type: String,
    default: '',
    trim: true,
  },
  googleMapUrl: {
    type: String,
    default: '',
    trim: true,
  },
  currencySymbol: {
    type: String,
    default: '₹',
    trim: true,
  },
  standardShippingFee: {
    type: Number,
    default: 50,
    min: 0,
  },
  freeShippingThreshold: {
    type: Number,
    default: 999,
    min: 0,
  },
  cashOnDeliveryEnabled: {
    type: Boolean,
    default: true,
  },
  cloudinaryCloudName: {
    type: String,
    default: '',
    trim: true,
  },
  cloudinaryUploadPreset: {
    type: String,
    default: '',
    trim: true,
  },
  adminName: {
    type: String,
    default: '',
    trim: true,
  },
  adminEmail: {
    type: String,
    default: '',
    trim: true,
  },
  facebookUrl: {
    type: String,
    default: '',
    trim: true,
  },
  instagramUrl: {
    type: String,
    default: '',
    trim: true,
  },
  youtubeUrl: {
    type: String,
    default: '',
    trim: true,
  },
  pinterestUrl: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
