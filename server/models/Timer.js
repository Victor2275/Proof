import mongoose from 'mongoose';

/*
 * Kitchen timers, shared live across every device over Socket.io.
 *
 * These used to live only in a module-level array, so a server restart silently
 * dropped every running timer with no way to recover — losing a 6-hour bulk
 * ferment to a deploy. Persisting them means a restart resumes rather than forgets.
 *
 * `endTime` is an absolute epoch-milliseconds deadline, so elapsed time keeps
 * counting down correctly across a restart; `remainingMs` is only meaningful while
 * a timer is paused (endTime null).
 */
const timerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: 'Timer' },
  endTime: { type: Number, default: null },
  remainingMs: { type: Number, default: 0 },
  hasRung: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Timer = mongoose.model('Timer', timerSchema);
