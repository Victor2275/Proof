import mongoose from 'mongoose';
import { ulid } from '../services/ulid.js';

/*
 * A recipe in the global cookbook.
 *
 * Publishing copies, it does not flag (LAUNCH_PLAN.md §1): this is a snapshot
 * taken at publish time, separate from the author's own record, so editing a
 * private recipe never silently changes a page other people are baking from.
 * `sourceLocalId` points back at the record it was taken from, which is how a
 * later "push update" finds the copy to replace.
 */
const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: null },
  unit: { type: String, default: '' },
}, { _id: false });

const publishedRecipeSchema = new mongoose.Schema({
  _id: { type: String, default: () => ulid() },
  authorId: { type: String, default: null },
  authorHandle: { type: String, required: true },
  sourceLocalId: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },

  title: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrls: { type: [String], default: [] },
  servings: { type: Number, default: null },
  difficulty: { type: String, default: '' },
  prepTime: { type: String, default: '' },
  cookTime: { type: String, default: '' },
  tags: { type: [String], default: [] },
  folder: { type: String, default: '' },
  ingredients: { type: [ingredientSchema], default: [] },
  instructions: { type: [String], default: [] },

  forkedFrom: {
    type: new mongoose.Schema({
      publishedId: String,
      authorHandle: String,
      title: String,
    }, { _id: false }),
    default: null,
  },
  sourceUrl: { type: String, default: '' },
  sourceAttribution: { type: String, default: '' },
  /** The author declared the method and headnote are in their own words (the attribution rule). */
  ownWords: { type: Boolean, default: false },
  /** The local record's updatedAt when this snapshot was taken: newer means unpushed edits (B6). */
  sourceUpdatedAt: { type: Date, default: null },
  /** Offered on a stranger's empty cookbook as a first thing to save (decision B15/B16). */
  featured: { type: Boolean, default: false },

  moderation: {
    state: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason: { type: String, default: '' },
    checkedAt: { type: Date, default: null },
  },
  stats: {
    saves: { type: Number, default: 0 },
    bakedCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },

  publishedAt: { type: Date, default: Date.now },
  unpublishedAt: { type: Date, default: null },
}, { timestamps: { createdAt: false, updatedAt: true } });

publishedRecipeSchema.index({ 'moderation.state': 1, unpublishedAt: 1, publishedAt: -1 });
publishedRecipeSchema.index({ authorId: 1, sourceLocalId: 1 });

export const PublishedRecipe = mongoose.model('PublishedRecipe', publishedRecipeSchema);

/** The filter for what a stranger may see: approved and still published. */
export const LIVE = { 'moderation.state': 'approved', unpublishedAt: null };
