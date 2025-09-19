import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  clubs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  }],
  partners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  }]
}, {
  timestamps: true
});

// Add indexes
collegeSchema.index({ name: 1 });
collegeSchema.index({ location: 1 });

const College = mongoose.model('College', collegeSchema);

export default College;
