import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { Timer } from '../models/Timer.js';
import { readSession, requireUser } from '../middleware/auth.js';
import mongoose from 'mongoose';

/*
 * Kitchen timers, synced live between one account's devices.
 *
 * A timer started on the iPad in the kitchen shows on the phone in the living
 * room — but only the same baker's phone. They used to be one list shared by
 * every connected client, which with strangers on the site would have put
 * anyone's timers on everyone's screen and let anyone stop them. Each account
 * has its own list and its own socket room now, and a socket must present a
 * signed-in session to join one. Without an account, timers run on the device
 * alone (src/components/TimerManager.tsx), which is all most bakes need.
 */
const router = Router();

export interface LiveTimer {
  id: string;
  name: string;
  endTime: number | null;
  remainingMs: number;
  hasRung: boolean;
}

// The hot path for broadcasts, keyed by owner. Mirrored to Mongo so a restart
// resumes running timers rather than forgetting a six-hour bulk ferment.
let timersByOwner = new Map<string, LiveTimer[]>();
let io: Server | null = null;

export const timersFor = (ownerId: string) => timersByOwner.get(ownerId) ?? [];
const room = (ownerId: string) => `user:${ownerId}`;

const setTimers = (ownerId: string, timers: LiveTimer[]) => {
  timersByOwner.set(ownerId, timers);
  io?.to(room(ownerId)).emit('timers:sync', timers);
};

const dbReady = () => mongoose.connection.readyState === 1;

export const persistTimers = async (op: () => Promise<unknown>) => {
  if (!dbReady()) return;
  try { await op(); }
  catch (err: any) { console.error('Timer persistence failed (timer still live in memory):', err.message); }
};

/** Accepts only a well-formed timer: a socket is input from anyone. */
export function cleanTimer(input: unknown): LiveTimer | null {
  if (!input || typeof input !== 'object') return null;
  const t = input as Record<string, unknown>;
  if (typeof t.id !== 'string' || !/^[\w-]{1,40}$/.test(t.id)) return null;
  const endTime = t.endTime === null ? null : Number(t.endTime);
  const remainingMs = Number(t.remainingMs);
  if (endTime !== null && !Number.isFinite(endTime)) return null;
  if (!Number.isFinite(remainingMs)) return null;
  return {
    id: t.id,
    name: typeof t.name === 'string' ? t.name.slice(0, 80) : 'Timer',
    endTime,
    remainingMs,
    hasRung: t.hasRung === true,
  };
}

const shape = ({ id, name, endTime, remainingMs, hasRung }: any): LiveTimer => ({ id, name, endTime, remainingMs, hasRung });

export const loadTimersFromDb = async () => {
  if (!dbReady()) return;
  try {
    const stored = await Timer.find({}).lean();
    const stillRelevant = stored.filter((t: any) => t.ownerId && (t.endTime === null || t.endTime > Date.now() || !t.hasRung));
    timersByOwner = new Map();
    for (const t of stillRelevant) {
      timersByOwner.set(t.ownerId as string, [...timersFor(t.ownerId as string), shape(t)]);
    }
    // Finished timers, and timers from the shared list before accounts existed.
    const staleIds = stored.filter((t: any) => !stillRelevant.includes(t)).map((t: any) => t._id);
    if (staleIds.length) await Timer.deleteMany({ _id: { $in: staleIds } });
  } catch (err: any) {
    console.error('Could not restore timers:', err.message);
  }
};

const upsertTimer = (ownerId: string, timer: LiveTimer) => {
  const current = timersFor(ownerId);
  const exists = current.some((t) => t.id === timer.id);
  setTimers(ownerId, exists ? current.map((t) => (t.id === timer.id ? timer : t)) : [...current, timer]);
  void persistTimers(() => Timer.updateOne({ ownerId, id: timer.id }, { $set: { ...timer, ownerId } }, { upsert: true }));
};

const removeTimer = (ownerId: string, id: string) => {
  const current = timersFor(ownerId);
  if (!current.some((t) => t.id === id)) return false;
  setTimers(ownerId, current.filter((t) => t.id !== id));
  void persistTimers(() => Timer.deleteOne({ ownerId, id }));
  return true;
};

// GET /api/timers
router.get('/', requireUser, (req: Request, res: Response) => {
  res.json(timersFor(req.user._id));
});

// DELETE /api/timers/:id
router.delete('/:id', requireUser, (req: Request, res: Response) => {
  if (!removeTimer(req.user._id, String(req.params.id))) return res.status(404).json({ error: 'Timer not found' });
  res.json({ success: true, timers: timersFor(req.user._id) });
});

export const registerTimerSockets = (server: Server) => {
  io = server;

  // A socket joins its account's room or none: no session, no shared timers.
  server.use(async (socket, next) => {
    const session = await readSession(socket.handshake.auth?.token).catch(() => null);
    if (session?.kind !== 'user') return next(new Error('Sign in to sync timers between devices.'));
    socket.data.ownerId = session.userId;
    next();
  });

  server.on('connection', (socket) => {
    const ownerId: string = socket.data.ownerId;
    void socket.join(room(ownerId));
    socket.emit('timers:sync', timersFor(ownerId));

    // Timers a device started before it connected (offline, or before signing in).
    socket.on('timers:merge', (incoming: unknown) => {
      if (!Array.isArray(incoming)) return;
      const known = new Set(timersFor(ownerId).map((t) => t.id));
      for (const raw of incoming.slice(0, 50)) {
        const timer = cleanTimer(raw);
        if (timer && !known.has(timer.id)) upsertTimer(ownerId, timer);
      }
      socket.emit('timers:sync', timersFor(ownerId));
    });

    socket.on('timer:add', (raw: unknown) => {
      const timer = cleanTimer(raw);
      if (timer) upsertTimer(ownerId, timer);
    });

    socket.on('timer:update', (raw: unknown) => {
      const timer = cleanTimer(raw);
      if (timer) upsertTimer(ownerId, timer);
    });

    socket.on('timer:remove', (id: unknown) => {
      if (typeof id === 'string') removeTimer(ownerId, id);
    });
  });
};

export default router;
