import mongoose from 'mongoose';

/*
 * One record of a Pro account's cookbook, kept so its devices stay in step
 * (LAUNCH_PLAN.md, Phase 4). The device is still the source of truth; this is
 * the copy the other devices pull from.
 *
 * Any record store syncs through this one collection, the record kept whole in
 * `data`. `_id` is `<userId>:<store>:<recordId>`, so a record is one row per
 * account however many devices push it.
 *
 * `updatedAt` is the device's own stamp on the record and decides which write
 * wins. `syncedAt` is the server's clock when the row last changed, and is
 * what a device's cursor counts from — device clocks can't be compared, so
 * they never order a pull.
 */
const syncRecordSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true },
  store: { type: String, required: true },
  recordId: { type: String, required: true },
  updatedAt: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  syncedAt: { type: Date, required: true },
}, { versionKey: false, minimize: false });

syncRecordSchema.index({ userId: 1, syncedAt: 1, _id: 1 });

export const SyncRecord = mongoose.model('SyncRecord', syncRecordSchema);
