import mongoose from 'mongoose';

/*
 * A one-use link sent by email: confirm this address, or reset this password.
 *
 * Like a session, the token is stored only as its SHA-256, and the TTL index
 * removes it when it expires — a day to confirm, an hour to reset. Using one
 * deletes it.
 */
const emailTokenSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true, index: true },
  purpose: { type: String, enum: ['verify', 'reset'], required: true },
  expiresAt: { type: Date, required: true },
});

emailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailToken = mongoose.model('EmailToken', emailTokenSchema);
