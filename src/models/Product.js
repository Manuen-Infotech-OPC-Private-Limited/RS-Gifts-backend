import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  sku: {
    type: String,
    required: [true, 'Product SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  occasions: [{
    type: String,
    trim: true,
  }],
  targetPages: [{
    type: String,
    trim: true,
  }],
  targetPage: {
    type: String,
    default: '',
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be non-negative'],
  },
  salePrice: {
    type: Number,
    default: null,
    min: [0, 'Sale price must be non-negative'],
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0,
  },
  image: {
    type: String,
    default: '',
  },
  gallery: [{
    type: String,
  }],
  active: {
    type: Boolean,
    default: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  personalization: {
    allowCustomText: { type: Boolean, default: false },
    customTextLabel: { type: String, default: '' },
    allowPhotoUpload: { type: Boolean, default: false },
    photoUploadRequired: { type: Boolean, default: false },
    allowGiftWrap: { type: Boolean, default: false },
    allowGreetingCard: { type: Boolean, default: false }
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Product = mongoose.model('Product', productSchema);
export default Product;
