import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  points: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

// Add indexes
achievementSchema.index({ key: 1 });
achievementSchema.index({ points: 1 });

const Achievement = mongoose.model('Achievement', achievementSchema);

export default Achievement;
