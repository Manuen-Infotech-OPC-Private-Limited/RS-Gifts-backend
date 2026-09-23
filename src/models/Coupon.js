const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'flat'],
    default: 'percentage',
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative'],
  },
  minOrderValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDiscount: {
    type: Number,
    default: 0, // 0 means no maximum cap
    min: 0,
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  usageLimit: {
    type: Number,
    default: 0, // 0 means unlimited
    min: 0,
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  active: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Check coupon validity against cart amount
couponSchema.methods.isValidForAmount = function (subtotal) {
  if (!this.active) {
    return { valid: false, message: 'Coupon is currently inactive' };
  }

  if (this.expiryDate && new Date(this.expiryDate) < new Date()) {
    return { valid: false, message: 'Coupon has expired' };
  }

  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Coupon usage limit has been reached' };
  }

  if (subtotal < this.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order value of ₹${this.minOrderValue} required for this coupon`
    };
  }

  let calculatedDiscount = 0;
  if (this.discountType === 'percentage') {
    calculatedDiscount = (subtotal * this.discountValue) / 100;
    if (this.maxDiscount > 0 && calculatedDiscount > this.maxDiscount) {
      calculatedDiscount = this.maxDiscount;
    }
  } else {
    calculatedDiscount = Math.min(this.discountValue, subtotal);
  }

  return {
    valid: true,
    discountAmount: Math.round(calculatedDiscount),
    code: this.code,
    discountType: this.discountType,
    discountValue: this.discountValue
  };
};

module.exports = mongoose.model('Coupon', couponSchema);
