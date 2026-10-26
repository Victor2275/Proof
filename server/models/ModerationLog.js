import mongoose from 'mongoose';
import { ulid } from '../services/ulid.js';

/*
 * One thing a moderator or the operator did: confirmed an account, made a
 * moderator, suspended someone, approved or took down a recipe. Kept so that
 * with more than one moderator, anyone can see who decided what, and when.
 *
 * `label` is what the target was called at the time (a handle, a title), so
 * the log still reads after the target is renamed or gone.
 */
const moderationLogSchema = new mongoose.Schema({
  _id: { type: String, default: () => ulid() },
  actorKind: { type: String, enum: ['operator', 'moderator'], required: true },
  actorId: { type: String, default: null },
  actorHandle: { type: String, default: '' },
  action: { type: String, required: true },
  targetType: { type: String, enum: ['account', 'recipe', 'comment', 'report'], required: true },
  targetId: { type: String, required: true, index: true },
  label: { type: String, default: '' },
  reason: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

moderationLogSchema.index({ createdAt: -1 });

export const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);
