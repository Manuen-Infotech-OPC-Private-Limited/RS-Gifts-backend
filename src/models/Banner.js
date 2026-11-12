import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  tagline: {
    type: String,
    trim: true,
    default: '',
  },
  title: {
    type: String,
    trim: true,
    default: '',
  },
  subtitle: {
    type: String,
    trim: true,
    default: '',
  },
  image: {
    type: String,
    required: [true, 'Banner image is required'],
  },
  link: {
    type: String,
    default: '',
  },
  buttonText: {
    type: String,
    default: 'Shop Now',
  },
  position: {
    type: String,
    enum: ['hero', 'promotional', 'popup', 'footer'],
    default: 'hero',
  },
  order: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
