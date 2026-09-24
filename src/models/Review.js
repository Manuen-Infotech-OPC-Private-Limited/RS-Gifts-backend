import mongoose from 'mongoose';

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

const Review = mongoose.model('Review', reviewSchema);
export default Review;
