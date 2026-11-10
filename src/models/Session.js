import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['admin', 'customer'],
    default: 'customer',
  },
  device: {
    type: String,
    default: 'Desktop Browser',
  },
  ipAddress: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  isValid: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Automatic MongoDB TTL document expiration
  },
}, {
  timestamps: true,
});

// Compound index for high performance token lookup
sessionSchema.index({ token: 1, user: 1, isValid: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;

