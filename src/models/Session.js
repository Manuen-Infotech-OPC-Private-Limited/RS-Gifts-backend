import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    index: true,
  },
  token: {
    type: String,
    select: false, // Prevents raw token exposure in default queries
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

// Compound indexes for high performance token lookup and session validation
sessionSchema.index({ tokenHash: 1, user: 1, isValid: 1 });
sessionSchema.index({ token: 1, user: 1, isValid: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;

