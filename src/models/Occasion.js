const mongoose = require('mongoose');

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

occasionSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }
  next();
});

module.exports = mongoose.model('Occasion', occasionSchema);
