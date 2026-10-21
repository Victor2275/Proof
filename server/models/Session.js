import mongoose from 'mongoose';

/*
 * A signed-in session: a user's, or the site operator's.
 *
 * Sessions used to live in a Map in memory, so every restart of the server —
 * every deploy, every Render spin-down — signed everyone out. They live here
 * now, and the TTL index removes each one when it expires.
 *
 * The token itself is never stored: `_id` is its SHA-256, so a copy of this
 * collection is not a set of working sessions. The token is 256 random bits,
 * so a fast hash is enough; there is nothing to guess.
 */
const sessionSchema = new mongoose.Schema({
  _id: { type: String },
  kind: { type: String, enum: ['user', 'operator'], required: true },
  userId: { type: String, default: null, index: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
