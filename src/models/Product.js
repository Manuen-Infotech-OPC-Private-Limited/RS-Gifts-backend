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
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.pre('validate', async function () {
  if (!this.productId) {
    if (this.sku && this.sku.trim()) {
      this.productId = this.sku.trim().toUpperCase();
    } else {
      try {
        const count = await mongoose.model('Product').countDocuments();
        this.productId = `PRD-${String(count + 1).padStart(4, '0')}`;
      } catch {
        this.productId = `PRD-${Date.now().toString().slice(-6)}`;
      }
    }
  }
  if (!this.sku) {
    this.sku = this.productId;
  }
});

productSchema.post(['find', 'findOne'], function (docs) {
  if (!docs) return;
  const list = Array.isArray(docs) ? docs : [docs];
  list.forEach(doc => {
    if (doc && !doc.productId) {
      doc.productId = doc.sku || (doc._id ? `PRD-${String(doc._id).slice(-4).toUpperCase()}` : 'PRD-0001');
    }
  });
});

const Product = mongoose.model('Product', productSchema);
export default Product;
