import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { PublishedRecipe, LIVE } from '../models/PublishedRecipe.js';

/*
 * The global cookbook, read side.
 *
 * Everything here is public and read-only: it is the content people chose to
 * publish, and it is what a stranger with an empty local cookbook is offered
 * first. Publishing itself (with accounts, moderation and attribution) is
 * Phase 3; for now the only writer is the operator's seeding script.
 */
const router = Router();

const dbReady = () => mongoose.connection.readyState === 1;
const sendDegraded = (res: Response) =>
  res.status(503).json({ error: 'The shared cookbook is unavailable right now. Your own recipes are unaffected.', degraded: true });

/** What a list needs: enough to draw a tile, not the whole method. */
const SUMMARY_FIELDS = 'slug title description imageUrls folder tags prepTime cookTime servings difficulty authorHandle sourceAttribution featured publishedAt';

const MAX_LIMIT = 200;

// GET /api/published?limit=&offset=&featured=1&tag=
router.get('/', async (req: Request, res: Response) => {
  if (!dbReady()) return sendDegraded(res);
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '48'), 10) || 48, 1), MAX_LIMIT);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const filter: Record<string, unknown> = { ...LIVE };
    if (req.query.featured === '1') filter.featured = true;
    if (typeof req.query.tag === 'string' && req.query.tag) filter.tags = req.query.tag;

    const [items, total] = await Promise.all([
      PublishedRecipe.find(filter).select(SUMMARY_FIELDS).sort({ title: 1 }).skip(offset).limit(limit).lean(),
      PublishedRecipe.countDocuments(filter),
    ]);
    res.json({ items, total, offset, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/published/:idOrSlug
router.get('/:idOrSlug', async (req: Request, res: Response) => {
  if (!dbReady()) return sendDegraded(res);
  try {
    const key = req.params.idOrSlug;
    const recipe = await PublishedRecipe.findOne({ ...LIVE, $or: [{ _id: key }, { slug: key }] }).lean();
    if (!recipe) return res.status(404).json({ error: 'Not in the shared cookbook. It may have been unpublished.' });
    res.json(recipe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
