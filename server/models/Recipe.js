import mongoose from 'mongoose';
import { recordFields } from './record.js';

/*
 * An ingredient. `quantity` is null when there is no amount ("to serve", "to
 * taste") rather than an invented 1, and `unit` is empty for a plain count
 * ("2 eggs") rather than the word "unit".
 */
const componentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: null },
  unit: { type: String, default: '' }
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  ...recordFields,
  title: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrls: { type: [String], default: [] },
  servings: { type: Number, default: 4 },
  difficulty: { type: String, default: 'Medium' },
  prepTime: { type: String, default: '' },
  cookTime: { type: String, default: '' },
  tags: [{ type: String }],
  ingredients: [componentSchema],
  instructions: {
    type: [String],
    required: true
  },
  instructionLinks: [{
    stepIndex: { type: Number, required: true },
    recipeId: { type: String, ref: 'Recipe', required: true },
    recipeTitle: { type: String, required: true }
  }],
  labNotes: {
    type: String,
    default: ''
  },
  folder: {
    type: String,
    default: 'Uncategorized'
  }
}, { timestamps: true });

export const Recipe = mongoose.model('Recipe', recipeSchema);
