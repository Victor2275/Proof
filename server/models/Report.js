import mongoose from 'mongoose';
import { ulid } from '../services/ulid.js';

/*
 * Someone flagged a published recipe or a comment. Reports land in the
 * operator's queue; the operator resolves each one, taking the content down
 * or leaving it up.
 */
const reportSchema = new mongoose.Schema({
  _id: { type: String, default: () => ulid() },
  targetType: { type: String, enum: ['recipe', 'comment'], required: true },
  targetId: { type: String, required: true, index: true },
  reason: { type: String, required: true, maxlength: 500 },
  reporterId: { type: String, default: null },
  resolvedAt: { type: Date, default: null },
  resolution: { type: String, default: '' },
}, { timestamps: true });

reportSchema.index({ resolvedAt: 1, createdAt: 1 });

export const Report = mongoose.model('Report', reportSchema);
