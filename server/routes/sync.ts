import { Router, Request, Response, NextFunction } from 'express';
import { requireUser } from '../middleware/auth.js';
import { SyncPhoto } from '../models/SyncPhoto.js';
import { User } from '../models/User.js';
import { applyChanges, changesSince, validChange, type Change } from '../services/sync.js';
import { cloudinary, cloudinaryConfigured } from '../services/cloudinary.js';
import { DATA_URL, MAX_PHOTO_BYTES } from '../services/publishing.js';

/*
 * Sync, for Pro accounts (services/sync.ts).
 *
 *   POST /api/sync          { changes?: [{ store, record }], since?: cursor | null }
 *                           → { newer: [...], changes?: [...], cursor?, more?, photos? }
 *   POST /api/sync/photos   { id, data: data URL } → { url }
 *
 * A request with `changes` pushes them; one with `since` (null for the first
 * time) also pulls a page. A device pushes first, then pulls until `more` is
 * false.
 */
const router = Router();

const MAX_CHANGES = 500;

type Authed = Request & { user: InstanceType<typeof User> };

const guard = (handler: (req: Authed, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, _next: NextFunction) =>
    handler(req as Authed, res).catch((err) => res.status(500).json({ error: (err as Error).message }));

/** A confirmed Pro account whose plan has not run out. */
const requirePro = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as Authed).user;
  const lapsed = user.planExpiresAt && user.planExpiresAt.getTime() < Date.now();
  if (user.plan === 'pro' && !lapsed && user.emailVerifiedAt) return next();
  res.status(403).json({ error: 'Sync is part of Pro.', plan: true });
};

router.use(requireUser, requirePro);

// POST /api/sync
router.post('/', guard(async (req, res) => {
  const raw = req.body?.changes ?? [];
  if (!Array.isArray(raw) || raw.length > MAX_CHANGES) {
    return res.status(400).json({ error: `Send at most ${MAX_CHANGES} changes at a time.` });
  }
  const changes = raw.map(validChange).filter((c): c is Change => c !== null);
  const now = new Date();
  const { accepted, newer } = await applyChanges(req.user._id, changes, now);
  const body: Record<string, unknown> = { accepted, skipped: raw.length - changes.length, newer };
  if ('since' in (req.body ?? {})) Object.assign(body, await changesSince(req.user._id, req.body.since, now));
  res.json(body);
}));

// POST /api/sync/photos
router.post('/photos', guard(async (req, res) => {
  const id = req.body?.id;
  const data = req.body?.data;
  if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) return res.status(400).json({ error: 'That is not a photograph id.' });
  const key = `${req.user._id}:${id}`;
  const known = await SyncPhoto.findById(key).lean<{ url: string }>();
  if (known) return res.json({ url: known.url });

  const match = typeof data === 'string' ? data.match(DATA_URL) : null;
  if (!match) return res.status(400).json({ error: 'Send the photograph as a WebP, JPEG or PNG data URL.' });
  const bytes = Buffer.byteLength(match[2], 'base64');
  if (bytes > MAX_PHOTO_BYTES) return res.status(413).json({ error: 'That photograph is too large.' });
  if (!cloudinaryConfigured()) {
    return res.status(503).json({ error: "The server can't store photographs yet. They'll go up later.", degraded: true });
  }

  const uploaded = await cloudinary.uploader.upload(data, { folder: `sync/${req.user._id}`, public_id: id, overwrite: false });
  await SyncPhoto.updateOne(
    { _id: key },
    { $setOnInsert: { userId: req.user._id, photoId: id, url: uploaded.secure_url, bytes, createdAt: new Date() } },
    { upsert: true },
  );
  res.json({ url: uploaded.secure_url });
}));

export default router;
