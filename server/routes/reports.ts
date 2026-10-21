import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { Report } from '../models/Report.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { Comment } from '../models/Comment.js';
import { loadUser } from '../middleware/auth.js';

/*
 * POST /api/reports — flag a published recipe or a comment for the operator.
 *
 * Anyone may report, signed in or not: a stranger who finds something awful
 * should not have to make an account to say so. Rate-limited per address.
 */
const router = Router();

const reportLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 20, message: { error: 'Too many reports from here. Try again later.' } });

router.post('/', reportLimiter, loadUser, async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Reports are unavailable right now. Try again shortly.', degraded: true });
  }
  try {
    const { targetType, targetId } = req.body ?? {};
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (targetType !== 'recipe' && targetType !== 'comment') return res.status(400).json({ error: 'Report a recipe or a comment.' });
    if (typeof targetId !== 'string') return res.status(400).json({ error: 'Nothing to report.' });
    if (!reason) return res.status(400).json({ error: 'Say what is wrong, so the operator knows what to look for.', field: 'reason' });

    const exists = targetType === 'recipe'
      ? await PublishedRecipe.exists({ _id: targetId })
      : await Comment.exists({ _id: targetId });
    if (!exists) return res.status(404).json({ error: 'That is already gone.' });

    await Report.create({ targetType, targetId, reason, reporterId: req.user?._id ?? null });
    res.status(201).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
