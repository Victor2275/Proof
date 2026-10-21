import mongoose from 'mongoose';
import { recordFields } from './record.js';

const bakeLogSchema = new mongoose.Schema({
  ...recordFields,
  recipeId: {
    type: String,
    ref: 'Recipe',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },

  notes: {
    type: String,
    default: ''
  },
  isPersonalBest: {
    type: Boolean,
    default: false
  },
  imageUrls: {
    type: [String],
    default: []
  },
  images: [{
    url: String,
    label: String
  }]
}, { timestamps: true });

export const BakeLog = mongoose.model('BakeLog', bakeLogSchema);
