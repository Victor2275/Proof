import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { PublishedRecipe, LIVE } from '../models/PublishedRecipe.js';
import { Rating } from '../models/Rating.js';
import { Comment } from '../models/Comment.js';
import { loadUser, requireUser, requireVerified } from '../middleware/auth.js';
import { publish, PublishError, publicRecipe, ownRecipe, readSubmission, recountRatings } from '../services/publishing.js';
import { screenComment } from '../services/moderation.js';

/*
 * The global cookbook (LAUNCH_PLAN.md, Phase 3).
 *
 *   GET    /api/published                 browse: ?sort=recent|baked|rating|title &tag= &author= &featured=1
 *   GET    /api/published/index           every live recipe in brief, for searching on the device
 *   GET    /api/published/mine            the signed-in author's copies, every state (B6, B7)
 *   GET    /api/published/:idOrSlug       one live recipe
 *   POST   /api/published                 publish, or push an update (confirmed email)
 *   DELETE /api/published/:id             unpublish (the author)
 *   POST   /api/published/:id/save        count a save into someone's cookbook
 *   GET    /api/published/:id/rating      the signed-in account's own rating
 *   PUT    /api/published/:id/rating      rate it and/or say "I baked this"
 *   GET    /api/published/:id/comments    the conversation
 *   POST   /api/published/:id/comments    add to it
 *   DELETE /api/published/comments/:id    take a comment down (its author, or the recipe's)
 */
const router = Router();

const dbReady = () => mongoose.connection.readyState === 1;
const sendDegraded = (res: Response) =>
  res.status(503).json({ error: 'The shared cookbook is unavailable right now. Your own recipes are unaffected.', degraded: true });

router.use((_req: Request, res: Response, next: NextFunction) => (dbReady() ? next() : sendDegraded(res)));

const guard = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) => handler(req, res).catch((err) => {
    if (err instanceof PublishError) return res.status(err.status).json({ error: err.message, field: err.field });
    res.status(500).json({ error: err.message });
  });

/** What a list needs: enough to draw a tile, not the whole method. */
const SUMMARY_FIELDS = 'slug title description imageUrls folder tags prepTime cookTime servings difficulty authorHandle sourceAttribution featured stats publishedAt';

const SORTS: Record<string, Record<string, 1 | -1>> = {
  recent: { publishedAt: -1 },
  baked: { 'stats.bakedCount': -1, publishedAt: -1 },
  rating: { 'stats.ratingCount': -1, 'stats.ratingSum': -1 },
  title: { title: 1 },
};

const MAX_LIMIT = 200;

// Per account where there is one; the routes that use these sit behind requireUser.
const byAccount = (req: Request) => req.user._id;
const publishLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 30, keyGenerator: byAccount, message: { error: 'That is a lot of publishing for one hour. Try again later.' } });
const commentLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 5, keyGenerator: byAccount, message: { error: 'Five comments an hour is the limit. Try again later.' } });
const saveLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 60, message: { error: 'Too many saves. Try again later.' } });

/** A day old before an account may comment: it keeps throwaway spam accounts off recipes. */
export const COMMENT_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;

const findLive = (key: string) => PublishedRecipe.findOne({ ...LIVE, $or: [{ _id: key }, { slug: key }] });

// GET /api/published
router.get('/', guard(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '48'), 10) || 48, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
  const filter: Record<string, unknown> = { ...LIVE };
  if (req.query.featured === '1') filter.featured = true;
  if (typeof req.query.tag === 'string' && req.query.tag) filter.tags = req.query.tag;
  if (typeof req.query.author === 'string' && req.query.author) filter.authorHandle = req.query.author.toLowerCase();
  const sort = SORTS[String(req.query.sort)] ?? SORTS.title;

  const [items, total] = await Promise.all([
    PublishedRecipe.find(filter).select(SUMMARY_FIELDS).sort(sort).skip(offset).limit(limit).lean(),
    PublishedRecipe.countDocuments(filter),
  ]);
  res.json({ items, total, offset, limit });
}));

// GET /api/published/index
router.get('/index', guard(async (_req, res) => {
  const items = await PublishedRecipe.find(LIVE).select(SUMMARY_FIELDS).sort({ title: 1 }).lean();
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ items });
}));

// GET /api/published/mine
router.get('/mine', requireUser, guard(async (req, res) => {
  const items = await PublishedRecipe.find({ authorId: req.user._id }).sort({ updatedAt: -1 }).lean();
  res.json({ items: items.map(ownRecipe) });
}));

// DELETE /api/published/comments/:id
router.delete('/comments/:id', requireUser, guard(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.id, deletedAt: null });
  if (!comment) return res.status(404).json({ error: 'That comment is already gone.' });
  const recipe = await PublishedRecipe.findById(comment.publishedId).select('authorId').lean();
  if (comment.userId !== req.user._id && recipe?.authorId !== req.user._id) {
    return res.status(403).json({ error: 'Only the comment\'s author or the recipe\'s can take it down.' });
  }
  comment.deletedAt = new Date();
  await comment.save();
  res.json({ ok: true });
}));

// GET /api/published/:idOrSlug
router.get('/:idOrSlug', guard(async (req, res) => {
  const recipe = await findLive(String(req.params.idOrSlug));
  if (!recipe) return res.status(404).json({ error: 'Not in the shared cookbook. It may have been unpublished.' });
  res.json(publicRecipe(recipe));
}));

// POST /api/published
router.post('/', requireVerified, publishLimiter, guard(async (req, res) => {
  const submission = readSubmission(req.body);
  const { recipe, droppedPhotos } = await publish(req.user, submission);
  res.status(200).json({ recipe: ownRecipe(recipe), droppedPhotos });
}));

// DELETE /api/published/:id
router.delete('/:id', requireUser, guard(async (req, res) => {
  const recipe = await PublishedRecipe.findOne({ _id: req.params.id, authorId: req.user._id });
  if (!recipe) return res.status(404).json({ error: 'That recipe is not one of yours, or is already gone.' });
  recipe.unpublishedAt = new Date();
  await recipe.save();
  res.json({ recipe: ownRecipe(recipe) });
}));

// POST /api/published/:id/save
router.post('/:id/save', saveLimiter, guard(async (req, res) => {
  const result = await PublishedRecipe.updateOne({ ...LIVE, _id: req.params.id }, { $inc: { 'stats.saves': 1 } });
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Not in the shared cookbook.' });
  res.json({ ok: true });
}));

// GET /api/published/:id/rating
router.get('/:id/rating', requireUser, guard(async (req, res) => {
  const rating = await Rating.findOne({ publishedId: req.params.id, userId: req.user._id }).lean();
  res.json({ stars: rating?.stars ?? null, baked: rating?.baked ?? false });
}));

// PUT /api/published/:id/rating
router.put('/:id/rating', requireUser, guard(async (req, res) => {
  const recipe = await findLive(String(req.params.id));
  if (!recipe) return res.status(404).json({ error: 'Not in the shared cookbook.' });
  if (recipe.authorId === req.user._id) return res.status(403).json({ error: "You can't rate your own recipe." });

  const update: Record<string, unknown> = {};
  if ('stars' in req.body) {
    const stars = req.body.stars === null ? null : Number(req.body.stars);
    if (stars !== null && (!Number.isInteger(stars) || stars < 1 || stars > 5)) {
      return res.status(400).json({ error: 'A rating is one to five.' });
    }
    update.stars = stars;
  }
  if ('baked' in req.body) update.baked = req.body.baked === true;

  const rating = await Rating.findOneAndUpdate(
    { publishedId: recipe._id, userId: req.user._id },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  await recountRatings(recipe._id);
  const fresh = await PublishedRecipe.findById(recipe._id).select('stats').lean();
  res.json({ rating: { stars: rating?.stars ?? null, baked: rating?.baked ?? false }, stats: fresh?.stats });
}));

const publicComment = (c: any, viewerId: string | null) => ({
  _id: c._id,
  authorHandle: c.authorHandle,
  body: c.body,
  createdAt: c.createdAt,
  pending: c.moderation?.state === 'pending',
  mine: !!viewerId && c.userId === viewerId,
});

// GET /api/published/:id/comments
router.get('/:id/comments', loadUser, guard(async (req, res) => {
  const viewerId = req.user?._id ?? null;
  // Approved comments for everyone; a held one only for the person who wrote it.
  const visible = viewerId
    ? { $or: [{ 'moderation.state': 'approved' }, { 'moderation.state': 'pending', userId: viewerId }] }
    : { 'moderation.state': 'approved' };
  const comments = await Comment.find({ publishedId: req.params.id, deletedAt: null, hiddenAt: null, ...visible }).sort({ createdAt: 1 }).limit(500).lean();
  res.json({ items: comments.map((c) => publicComment(c, viewerId)) });
}));

// POST /api/published/:id/comments
router.post('/:id/comments', requireVerified, commentLimiter, guard(async (req, res) => {
  const recipe = await findLive(String(req.params.id));
  if (!recipe) return res.status(404).json({ error: 'Not in the shared cookbook.' });
  if (Date.now() - new Date(req.user.createdAt).getTime() < COMMENT_ACCOUNT_AGE_MS) {
    return res.status(403).json({ error: 'New accounts can comment after their first day. It keeps throwaway spam off the recipes.' });
  }
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body) return res.status(400).json({ error: 'Write something first.', field: 'body' });
  if (body.length > 1000) return res.status(400).json({ error: 'A comment is at most 1,000 characters.', field: 'body' });

  const screen = await screenComment(body, recipe.title);
  const comment = await Comment.create({
    publishedId: recipe._id,
    userId: req.user._id,
    authorHandle: req.user.handle,
    body,
    moderation: { state: screen.verdict === 'approve' ? 'approved' : 'pending', reason: screen.reason },
  });
  res.status(201).json({ comment: publicComment(comment.toObject(), req.user._id) });
}));

export default router;
