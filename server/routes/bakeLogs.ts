import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { BakeLog } from '../models/BakeLog.js';
import { sampleBakeLogs } from '../fixtures/sampleData.js';

const router = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const dbReady = () => mongoose.connection.readyState === 1;
const sendDegraded = (res: Response) =>
  res.status(503).json({ error: 'The recipe database is unavailable. Reconnecting — your data is safe.', degraded: true });

// GET /api/bakelogs
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!dbReady()) return DEMO_MODE ? res.json(sampleBakeLogs) : sendDegraded(res);
    const logs = await BakeLog.find().populate('recipeId', 'title').sort({ date: -1 });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recipes/:recipeId/bakelogs  (mounted on recipes router via app)
router.get('/recipe/:recipeId', async (req: Request, res: Response) => {
  try {
    if (!dbReady()) return DEMO_MODE ? res.json((sampleBakeLogs as any[]).filter((b: any) => b.recipeId._id === req.params.recipeId)) : sendDegraded(res);
    const logs = await BakeLog.find({ recipeId: req.params.recipeId }).sort({ date: -1 });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bakelogs
router.post('/', async (req: Request, res: Response) => {
  try {
    const log = new BakeLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/bakelogs/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const log = await BakeLog.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/bakelogs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const log = await BakeLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'BakeLog deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
