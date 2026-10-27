import mongoose from 'mongoose';

/*
 * A photograph from a Pro account's cookbook, uploaded to Cloudinary so its
 * other devices can fetch it. Records refer to photographs as `photo:<id>`;
 * the id is the device's own, so every device stores the photograph under the
 * same id and no record has to be rewritten.
 */
const syncPhotoSchema = new mongoose.Schema({
  _id: { type: String }, // <userId>:<photoId>
  userId: { type: String, required: true },
  photoId: { type: String, required: true },
  url: { type: String, required: true },
  bytes: { type: Number, default: 0 },
  createdAt: { type: Date, required: true },
}, { versionKey: false });

syncPhotoSchema.index({ userId: 1, createdAt: 1 });

export const SyncPhoto = mongoose.model('SyncPhoto', syncPhotoSchema);
