import mongoose from 'mongoose';

const occasionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Occasion name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Occasion slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Occasion = mongoose.model('Occasion', occasionSchema);
export default Occasion;
