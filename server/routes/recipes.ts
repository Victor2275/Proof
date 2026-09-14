import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Recipe } from '../models/Recipe.js';
import { requireAdmin } from '../middleware/auth.js';
import { sampleRecipes } from '../fixtures/sampleData.js';

const router = Router();

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const dbReady = () => mongoose.connection.readyState === 1;
const sendDegraded = (res: Response) =>
  res.status(503).json({ error: 'The recipe database is unavailable. Reconnecting — your data is safe.', degraded: true });

// GET /api/recipes
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!dbReady()) {
      if (!DEMO_MODE) return sendDegraded(res);
      if (req.query.search) {
        const s = (req.query.search as string).toLowerCase();
        return res.json(sampleRecipes.filter((r: any) => r.title.toLowerCase().includes(s) || r.tags.some((t: string) => t.toLowerCase().includes(s))));
      }
      return res.json(sampleRecipes);
    }
    const query: any = {};
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { tags: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    const recipes = await Recipe.find(query).sort({ updatedAt: -1 });
    res.json(recipes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!dbReady()) {
      if (!DEMO_MODE) return sendDegraded(res);
      const match = sampleRecipes.find((r: any) => r._id === req.params.id);
      if (!match) return res.status(404).json({ error: 'Recipe not found', degraded: true });
      return res.json(match);
    }
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recipes
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const recipe = new Recipe(req.body);
    await recipe.save();
    res.status(201).json(recipe);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/recipes/:id
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
