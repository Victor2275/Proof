import mongoose from 'mongoose';
import { ulid } from '../services/ulid.js';

/*
 * A comment on a published recipe — the one free-text surface open to every
 * account, so the unguarded flank (LAUNCH_PLAN.md, Accepted risk 1). It takes
 * a confirmed email, an account a day old, a screen of the text, and a rate
 * limit. A held comment is visible to its author only, until the operator
 * decides.
 */
const commentSchema = new mongoose.Schema({
  _id: { type: String, default: () => ulid() },
  publishedId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  authorHandle: { type: String, required: true },
  body: { type: String, required: true, maxlength: 1000 },
  moderation: {
    state: { type: String, enum: ['approved', 'pending', 'removed'], default: 'pending' },
    reason: { type: String, default: '' },
  },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

commentSchema.index({ publishedId: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
