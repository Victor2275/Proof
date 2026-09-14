import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Pantry } from '../models/Pantry.js';
import { requireAdmin } from '../middleware/auth.js';
import { samplePantry } from '../fixtures/sampleData.js';

const router = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const dbReady = () => mongoose.connection.readyState === 1;
const sendDegraded = (res: Response) =>
  res.status(503).json({ error: 'The recipe database is unavailable. Reconnecting — your data is safe.', degraded: true });

// GET /api/pantry
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!dbReady()) return DEMO_MODE ? res.json(samplePantry) : sendDegraded(res);
    const items = await Pantry.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pantry
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = new Pantry(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/pantry/:id
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await Pantry.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
