import mongoose from 'mongoose';
import { ulid } from '../services/ulid.js';

/*
 * An account (LAUNCH_PLAN.md, Phase 2).
 *
 * An account is needed only to publish or to sync; the cookbook itself never
 * needs one. Email and password, so a self-hosted Proof has no vendor to sign
 * in through. The password is stored only as an argon2id hash.
 *
 * `handle` is the public name — /@handle, "Adapted from @handle" — and is
 * unique case-insensitively, so it is stored lowercased.
 */
const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => ulid() },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  handle: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, default: '' },
  bio: { type: String, default: '' },
  emailVerifiedAt: { type: Date, default: null },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  planExpiresAt: { type: Date, default: null },
  /** AI actions used in `period` (YYYY-MM). A new month starts the count again. */
  aiQuota: {
    period: { type: String, default: '' },
    used: { type: Number, default: 0 },
  },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
