import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }]
}, {
  timestamps: true
});

// Add indexes
clubSchema.index({ name: 1 });
clubSchema.index({ college: 1 });

// Ensure unique club names per college
clubSchema.index({ name: 1, college: 1 }, { unique: true });

const Club = mongoose.model('Club', clubSchema);

export default Club;
