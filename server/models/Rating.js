import mongoose from 'mongoose';
import { ulid } from '../services/ulid.js';

/*
 * One account's verdict on a published recipe: stars, and whether they baked
 * it. No free text, so nothing to moderate (LAUNCH_PLAN.md, Phase 3 item 7).
 * One per account per recipe; rating again replaces it.
 */
const ratingSchema = new mongoose.Schema({
  _id: { type: String, default: () => ulid() },
  publishedId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  /** 1–5, or null for "I baked this" without a verdict. */
  stars: { type: Number, min: 1, max: 5, default: null },
  baked: { type: Boolean, default: false },
}, { timestamps: true });

ratingSchema.index({ publishedId: 1, userId: 1 }, { unique: true });

export const Rating = mongoose.model('Rating', ratingSchema);
