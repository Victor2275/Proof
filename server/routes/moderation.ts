import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireOperator } from '../middleware/auth.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';

/*
 * The operator's moderation queue (LAUNCH_PLAN.md, Phase 3 item 10).
 *
 *   GET  /api/moderation/queue              held recipes, held comments, open reports
 *   POST /api/moderation/recipes/:id        { action: approve | reject | takedown, reason }
 *   POST /api/moderation/comments/:id       { action: approve | remove, reason }
 *   POST /api/moderation/reports/:id        { resolution } — close a report
 *
 * A rejection keeps the recipe with its reason, so the author sees what to fix
 * and can resubmit (B7); a takedown also removes a live recipe from view.
 */
const router = Router();

router.use(requireOperator);
router.use((_req, res, next) =>
  mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'The database is unavailable.', degraded: true }));

const guard = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) => handler(req, res).catch((err) => res.status(500).json({ error: err.message }));

const reasonOf = (req: Request) => (typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '');

// GET /api/moderation/queue
router.get('/queue', guard(async (_req, res) => {
  const [recipes, comments, reports] = await Promise.all([
    PublishedRecipe.find({ 'moderation.state': 'pending', unpublishedAt: null })
      .select('slug title description authorHandle sourceUrl sourceAttribution ownWords moderation imageUrls instructions publishedAt updatedAt')
      .sort({ updatedAt: 1 }).limit(100).lean(),
    Comment.find({ 'moderation.state': 'pending', deletedAt: null }).sort({ createdAt: 1 }).limit(100).lean(),
    Report.find({ resolvedAt: null }).sort({ createdAt: 1 }).limit(100).lean(),
  ]);

  // Each report carries what it is about, so the queue reads without a second lookup.
  const recipeIds = reports.filter((r) => r.targetType === 'recipe').map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === 'comment').map((r) => r.targetId);
  const [reportedRecipes, reportedComments] = await Promise.all([
    PublishedRecipe.find({ _id: { $in: recipeIds } }).select('slug title authorHandle unpublishedAt').lean(),
    Comment.find({ _id: { $in: commentIds } }).select('body authorHandle publishedId deletedAt moderation').lean(),
  ]);
  const byId = new Map<string, unknown>([...reportedRecipes, ...reportedComments].map((d: any) => [d._id, d]));

  res.json({
    recipes,
    comments,
    reports: reports.map((r) => ({ ...r, target: byId.get(r.targetId) ?? null })),
  });
}));

// POST /api/moderation/recipes/:id
router.post('/recipes/:id', guard(async (req, res) => {
  const recipe = await PublishedRecipe.findById(req.params.id);
  if (!recipe) return res.status(404).json({ error: 'No such recipe.' });
  const now = new Date();
  const action = req.body?.action;
  if (action === 'approve') {
    recipe.moderation = { state: 'approved', reason: '', checkedAt: now };
  } else if (action === 'reject') {
    recipe.moderation = { state: 'rejected', reason: reasonOf(req) || 'Held back by the operator.', checkedAt: now };
  } else if (action === 'takedown') {
    recipe.moderation = { state: 'rejected', reason: reasonOf(req) || 'Taken down by the operator.', checkedAt: now };
    recipe.unpublishedAt = now;
  } else {
    return res.status(400).json({ error: 'Approve, reject or take down.' });
  }
  await recipe.save();
  res.json({ ok: true, state: recipe.moderation.state });
}));

// POST /api/moderation/comments/:id
router.post('/comments/:id', guard(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ error: 'No such comment.' });
  const action = req.body?.action;
  if (action === 'approve') comment.moderation = { state: 'approved', reason: '' };
  else if (action === 'remove') comment.moderation = { state: 'removed', reason: reasonOf(req) };
  else return res.status(400).json({ error: 'Approve or remove.' });
  await comment.save();
  res.json({ ok: true, state: comment.moderation.state });
}));

// POST /api/moderation/reports/:id
router.post('/reports/:id', guard(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'No such report.' });
  report.resolvedAt = new Date();
  report.resolution = typeof req.body?.resolution === 'string' ? req.body.resolution.slice(0, 300) : 'Resolved';
  await report.save();
  res.json({ ok: true });
}));

export default router;
