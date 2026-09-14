import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { Timer } from '../models/Timer.js';
import { requireAdmin } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = Router();

// In-memory timer state — the hot path for Socket.io broadcasts.
// Mirrored to Mongo so restarts resume running timers.
export let globalTimers: any[] = [];

const dbReady = () => mongoose.connection.readyState === 1;

export const persistTimers = async (op: () => Promise<any>) => {
  if (!dbReady()) return;
  try { await op(); }
  catch (err: any) { console.error('Timer persistence failed (timer still live in memory):', err.message); }
};

export const loadTimersFromDb = async () => {
  if (!dbReady()) return;
  try {
    const stored = await Timer.find({}).lean();
    const stillRelevant = stored.filter((t: any) => t.endTime === null || t.endTime > Date.now() || !t.hasRung);
    globalTimers = stillRelevant.map(({ id, name, endTime, remainingMs, hasRung }: any) => ({ id, name, endTime, remainingMs, hasRung }));
    const staleIds = stored.filter((t: any) => !stillRelevant.includes(t)).map((t: any) => t.id);
    if (staleIds.length) await Timer.deleteMany({ id: { $in: staleIds } });
    if (globalTimers.length) console.log(`Resumed ${globalTimers.length} timer(s) from the database`);
  } catch (err: any) {
    console.error('Could not restore timers:', err.message);
  }
};

// GET /api/timers
router.get('/', (_req: Request, res: Response) => {
  res.json(globalTimers);
});

// DELETE /api/timers/:id
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const before = globalTimers.length;
  globalTimers = globalTimers.filter(t => t.id !== req.params.id);
  if (globalTimers.length === before) return res.status(404).json({ error: 'Timer not found' });
  await persistTimers(() => Timer.deleteOne({ id: req.params.id }));
  // io broadcast happens in index.js where io is available
  res.json({ success: true, timers: globalTimers });
});

export const registerTimerSockets = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected to Socket.io');
    socket.emit('timers:sync', globalTimers);

    socket.on('timer:add', (timer: any) => {
      globalTimers.push(timer);
      io.emit('timers:sync', globalTimers);
      persistTimers(() => Timer.updateOne({ id: timer.id }, { $set: timer }, { upsert: true }));
    });

    socket.on('timer:update', (timerUpdate: any) => {
      globalTimers = globalTimers.map(t => t.id === timerUpdate.id ? { ...t, ...timerUpdate } : t);
      io.emit('timers:sync', globalTimers);
      persistTimers(() => Timer.updateOne({ id: timerUpdate.id }, { $set: timerUpdate }, { upsert: true }));
    });

    socket.on('timer:remove', (id: string) => {
      globalTimers = globalTimers.filter(t => t.id !== id);
      io.emit('timers:sync', globalTimers);
      persistTimers(() => Timer.deleteOne({ id }));
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};

export default router;
