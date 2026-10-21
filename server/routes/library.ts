import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireOperator } from '../middleware/auth.js';
import { Recipe } from '../models/Recipe.js';
import { BakeLog } from '../models/BakeLog.js';
import { Note } from '../models/Note.js';
import { Pantry } from '../models/Pantry.js';

/*
 * The operator's library from before Phase 1, read once per device.
 *
 * Before the cookbook moved onto the device, every recipe, bake, note and
 * pantry item was written here, and read publicly. The device is the source of
 * truth now and nothing writes to these collections, so all that remains is
 * the one read the operator needs to bring the library across
 * (Settings → Operator → Copy the server library here). It is the operator's
 * private library, so it is the operator's to read.
 */
const router = Router();

const dbReady = () => mongoose.connection.readyState === 1;
const LIVE = { deletedAt: null };

// GET /api/library
router.get('/', requireOperator, async (_req: Request, res: Response) => {
  if (!dbReady()) {
    return res.status(503).json({ error: 'The server library is unavailable right now. Try again shortly.', degraded: true });
  }
  try {
    const [recipes, bakeLogs, notes, pantry] = await Promise.all([
      Recipe.find(LIVE).lean(),
      BakeLog.find(LIVE).lean(),
      Note.find(LIVE).lean(),
      Pantry.find(LIVE).lean(),
    ]);
    res.json({ recipes, bakeLogs, notes, pantry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
