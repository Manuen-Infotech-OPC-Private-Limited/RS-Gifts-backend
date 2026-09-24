import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  storeName: {
    type: String,
    default: 'RS Gifts',
    trim: true,
  },
  storeTagline: {
    type: String,
    default: 'Memorable gifts for every occasion',
    trim: true,
  },
  supportEmail: {
    type: String,
    default: 'support@rsgifts.com',
    trim: true,
  },
  contactPhone: {
    type: String,
    default: '+91 98765 43210',
    trim: true,
  },
  storeAddress: {
    type: String,
    default: '123 Gift Street, Celebration City, India',
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
    default: 'RS Gifts Admin',
    trim: true,
  },
  adminEmail: {
    type: String,
    default: 'admin@rsgifts.com',
    trim: true,
  },
}, {
  timestamps: true,
});

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
