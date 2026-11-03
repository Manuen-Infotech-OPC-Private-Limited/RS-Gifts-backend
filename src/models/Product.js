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
  productId: {
    type: String,
    trim: true,
    uppercase: true,
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
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
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5,
  },
  ratings: {
    average: { type: Number, default: 5, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  experienceTitle: {
    type: String,
    default: 'The RS Gifts Experience',
    trim: true,
  },
  experienceText: {
    type: String,
    default: '',
    trim: true,
  },
  inTheBox: {
    type: String,
    default: '',
    trim: true,
  },
  specifications: {
    material: { type: String, default: '', trim: true },
    dimensions: { type: String, default: '', trim: true },
    weight: { type: String, default: '', trim: true },
    color: { type: String, default: '', trim: true },
    countryOfOrigin: { type: String, default: 'India', trim: true },
    careInstructions: { type: String, default: '', trim: true },
    customSpecs: [{
      key: { type: String, default: '', trim: true },
      value: { type: String, default: '', trim: true }
    }]
  },
  shippingDetails: {
    dispatchTimeline: { type: String, default: '', trim: true },
    transitTimeline: { type: String, default: '', trim: true },
    freeShippingNote: { type: String, default: '', trim: true },
    returnPolicy: { type: String, default: '', trim: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.pre('validate', async function () {
  let digits = String(this.productId || this.sku || '').replace(/\D/g, '');
  if (digits.length > 6) {
    digits = digits.slice(-6);
  }

  // Check if digits is valid 6 numbers and not already taken by another product
  if (digits.length === 6) {
    const existing = await mongoose.model('Product').findOne({
      _id: { $ne: this._id },
      $or: [{ productId: digits }, { sku: digits }]
    }).lean();
    if (!existing) {
      this.productId = digits;
      this.sku = digits;
      return;
    }
  }

  // If missing or taken by another product, find the next available sequential 6-digit ID
  const allProducts = await mongoose.model('Product').find({ _id: { $ne: this._id } }, 'productId sku').lean();
  const taken = new Set(
    allProducts
      .flatMap(p => [p.productId, p.sku])
      .filter(id => id && /^\d{6}$/.test(String(id).trim()))
      .map(id => String(id).trim())
  );

  let nextNum = 100001;
  while (taken.has(String(nextNum))) {
    nextNum++;
  }

  this.productId = String(nextNum);
  this.sku = String(nextNum);
});

productSchema.post(['find', 'findOne'], function (docs) {
  if (!docs) return;
  const list = Array.isArray(docs) ? docs : [docs];
  list.forEach(doc => {
    if (doc) {
      // Ensure product ID is always strictly 6 numbers
      if (!doc.productId || !/^\d{6}$/.test(String(doc.productId))) {
        const raw = doc.productId || doc.sku || '';
        const digits = String(raw).replace(/\D/g, '');
        if (digits.length === 6) {
          doc.productId = digits;
        } else if (digits.length > 6) {
          doc.productId = digits.slice(-6);
        } else if (doc._id) {
          doc.productId = String(parseInt(String(doc._id).slice(-6), 16) % 900000 + 100000);
        } else {
          doc.productId = Math.floor(100000 + Math.random() * 900000).toString();
        }
      }
      if (!doc.sku || !/^\d{6}$/.test(String(doc.sku))) {
        doc.sku = doc.productId;
      }
    }
  });
});

const Product = mongoose.model('Product', productSchema);
export default Product;
