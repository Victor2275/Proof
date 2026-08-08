import mongoose from 'mongoose';

const bakeLogSchema = new mongoose.Schema({
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  temperature: {
    type: String,
    default: ''
  },
  humidity: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  imageUrls: {
    type: [String],
    default: []
  }
}, { timestamps: true });

export const BakeLog = mongoose.model('BakeLog', bakeLogSchema);
