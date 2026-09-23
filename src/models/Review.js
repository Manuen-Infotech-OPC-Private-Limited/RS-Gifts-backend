const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  customerEmail: {
    type: String,
    trim: true,
    default: '',
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
  },
  isApproved: {
    type: Boolean,
    default: true,
  },
  adminReply: {
    type: String,
    default: '',
    trim: true,
  }
}, {
  timestamps: true,
});

// Static method to update product average rating
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  try {
    const Product = mongoose.model('Product');
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        'ratings.average': Math.round(stats[0].avgRating * 10) / 10,
        'ratings.count': stats[0].count,
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        'ratings.average': 0,
        'ratings.count': 0,
      });
    }
  } catch (error) {
    console.error('Error updating product average rating:', error);
  }
};

reviewSchema.post('save', function () {
  this.constructor.calculateAverageRating(this.product);
});

reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) {
    doc.constructor.calculateAverageRating(doc.product);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
