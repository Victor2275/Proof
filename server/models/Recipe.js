import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true }
}, { _id: false });

const recipeSchema = new mongoose.Schema({
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
  labNotes: {
    type: String,
    default: ''
  },
  // Versioning Fields
  parentRecipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  },
  versionNumber: {
    type: Number,
    default: 1
  },
  isLatestVersion: {
    type: Boolean,
    default: true
  },
  commitMessage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export const Recipe = mongoose.model('Recipe', recipeSchema);
