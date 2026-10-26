import { Router, Request, Response } from 'express';
import { requireModerator, endUserSessions } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { ModerationLog } from '../models/ModerationLog.js';
import { liftSuspension, staffUser, suspendAccount } from '../services/accounts.js';
import { logAction, type Staff } from '../services/moderationLog.js';

/*
 * Accounts, as moderators and the operator see them.
 *
 *   GET  /api/accounts                  ?q= &filter=all|unconfirmed|moderators|suspended &offset=
 *   GET  /api/accounts/:id              the account, what it published and wrote, reports against it, its log
 *   POST /api/accounts/:id/confirm      confirm the email by hand (while the site cannot send mail)
 *   POST /api/accounts/:id/role         { role: moderator | user }
 *   POST /api/accounts/:id/suspend      { reason } — signs out, hides its recipes and comments
 *   POST /api/accounts/:id/unsuspend
 *   POST /api/accounts/:id/signout      end every session it has
 *
 * Nobody changes, suspends or signs out their own account here, so a
 * moderator cannot lock themselves out by a slip. Moderators are not
 * suspended: remove the role first, which leaves a line in the log.
 */
const router = Router();

router.use(requireModerator);

const guard = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) => handler(req, res).catch((err) => res.status(500).json({ error: err.message }));

const staffOf = (req: Request) => (req as Request & { staff: Staff }).staff;
const reasonOf = (req: Request) => (typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '');
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PAGE = 50;

const FILTERS: Record<string, Record<string, unknown>> = {
  all: {},
  unconfirmed: { emailVerifiedAt: null },
  moderators: { role: 'moderator' },
  suspended: { suspendedAt: { $ne: null } },
};

// GET /api/accounts
router.get('/', guard(async (req, res) => {
  const filter: Record<string, unknown> = { ...(FILTERS[String(req.query.filter ?? 'all')] ?? {}) };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().replace(/^@/, '').slice(0, 100) : '';
  if (q) {
    const match = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ handle: match }, { email: match }, { displayName: match }];
  }
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(offset).limit(PAGE),
    User.countDocuments(filter),
  ]);
  res.json({ items: users.map(staffUser), total, offset, limit: PAGE });
}));

/** The account an action names, or a 404 already sent. Refuses the caller's own account. */
async function target(req: Request, res: Response) {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'No such account.' });
    return null;
  }
  if (user._id === staffOf(req).userId) {
    res.status(400).json({ error: "That's your own account. Ask another moderator, or the operator." });
    return null;
  }
  return user;
}

// GET /api/accounts/:id
router.get('/:id', guard(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'No such account.' });
  const [published, comments, sessions, log] = await Promise.all([
    PublishedRecipe.find({ authorId: user._id })
      .select('slug title moderation unpublishedAt hiddenAt publishedAt')
      .sort({ publishedAt: -1 }).limit(100).lean(),
    Comment.find({ userId: user._id }).select('publishedId body moderation deletedAt hiddenAt createdAt')
      .sort({ createdAt: -1 }).limit(20).lean(),
    Session.countDocuments({ kind: 'user', userId: user._id, expiresAt: { $gt: new Date() } }),
    ModerationLog.find({ targetType: 'account', targetId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const commentIds = (await Comment.find({ userId: user._id }).select('_id').lean()).map((c) => c._id);
  const reports = await Report.find({
    $or: [
      { targetType: 'recipe', targetId: { $in: published.map((r) => r._id) } },
      { targetType: 'comment', targetId: { $in: commentIds } },
    ],
  }).sort({ createdAt: -1 }).limit(20).lean();

  // A comment reads better with the recipe it was left on.
  const titles = new Map(
    (await PublishedRecipe.find({ _id: { $in: comments.map((c) => c.publishedId) } }).select('title slug').lean())
      .map((r) => [r._id, { title: r.title, slug: r.slug }]),
  );

  res.json({
    account: staffUser(user),
    sessions,
    published,
    comments: comments.map((c) => ({ ...c, recipe: titles.get(c.publishedId) ?? null })),
    reports,
    log,
  });
}));

// POST /api/accounts/:id/confirm
router.post('/:id/confirm', guard(async (req, res) => {
  const user = await target(req, res);
  if (!user) return;
  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await user.save();
    await logAction(staffOf(req), { action: 'account.confirm', targetType: 'account', targetId: user._id, label: `@${user.handle}` });
  }
  res.json({ account: staffUser(user) });
}));

// POST /api/accounts/:id/role
router.post('/:id/role', guard(async (req, res) => {
  const role = req.body?.role;
  if (role !== 'moderator' && role !== 'user') return res.status(400).json({ error: 'Make a moderator, or remove the role.' });
  const user = await target(req, res);
  if (!user) return;
  if (role === 'moderator') {
    if (user.suspendedAt) return res.status(409).json({ error: 'Lift the suspension first.' });
    if (!user.emailVerifiedAt) return res.status(409).json({ error: 'Confirm the account first, so a moderator is someone whose address is known.' });
  }
  if (user.role !== role) {
    user.role = role;
    await user.save();
    await logAction(staffOf(req), {
      action: role === 'moderator' ? 'account.promote' : 'account.demote',
      targetType: 'account',
      targetId: user._id,
      label: `@${user.handle}`,
    });
  }
  res.json({ account: staffUser(user) });
}));

// POST /api/accounts/:id/suspend
router.post('/:id/suspend', guard(async (req, res) => {
  const reason = reasonOf(req);
  if (!reason) return res.status(400).json({ error: 'Give a reason. The person sees it when they try to sign in.', field: 'reason' });
  const user = await target(req, res);
  if (!user) return;
  if (user.role === 'moderator') return res.status(409).json({ error: 'Moderators are not suspended. Remove the moderator role first.' });
  if (!user.suspendedAt) {
    await suspendAccount(user, reason);
    await logAction(staffOf(req), { action: 'account.suspend', targetType: 'account', targetId: user._id, label: `@${user.handle}`, reason });
  }
  res.json({ account: staffUser(user) });
}));

// POST /api/accounts/:id/unsuspend
router.post('/:id/unsuspend', guard(async (req, res) => {
  const user = await target(req, res);
  if (!user) return;
  if (user.suspendedAt) {
    await liftSuspension(user);
    await logAction(staffOf(req), { action: 'account.unsuspend', targetType: 'account', targetId: user._id, label: `@${user.handle}` });
  }
  res.json({ account: staffUser(user) });
}));

// POST /api/accounts/:id/signout
router.post('/:id/signout', guard(async (req, res) => {
  const user = await target(req, res);
  if (!user) return;
  await endUserSessions(user._id);
  await logAction(staffOf(req), { action: 'account.signout', targetType: 'account', targetId: user._id, label: `@${user.handle}` });
  res.json({ ok: true });
}));

export default router;
