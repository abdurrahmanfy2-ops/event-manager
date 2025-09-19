import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['sponsor', 'vendor', 'school', 'community'],
    default: 'sponsor'
  },
  contact: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add indexes
partnerSchema.index({ name: 1 });
partnerSchema.index({ type: 1 });

const Partner = mongoose.model('Partner', partnerSchema);

export default Partner;
