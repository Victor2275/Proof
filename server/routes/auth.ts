import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { emailConfigured, issueToken, redeemToken, resetEmail, sendEmail, verificationEmail } from '../services/email.js';
import {
  bearerToken,
  createSession,
  endSession,
  endUserSessions,
  requireUser,
} from '../middleware/auth.js';
import {
  AccountError,
  checkEmail,
  checkHandle,
  checkPassword,
  checkPasswordAgainst,
  deleteAccount,
  exportAccount,
  hashPassword,
  normaliseEmail,
  privateUser,
} from '../services/accounts.js';

/*
 * Accounts and sessions (LAUNCH_PLAN.md, Phase 2).
 *
 *   POST   /api/auth/pin         operator PIN → operator session
 *   POST   /api/auth/signup      create an account → user session
 *   POST   /api/auth/login       email + password → user session
 *   POST   /api/auth/logout      end this session
 *   GET    /api/auth/me          the account
 *   PATCH  /api/auth/me          display name, bio, handle
 *   POST   /api/auth/password    change the password (ends other sessions)
 *   GET    /api/auth/export      everything the server holds, as JSON
 *   DELETE /api/auth/me          delete the account (password required)
 *   POST   /api/auth/verify          confirm the email from the emailed link
 *   POST   /api/auth/verify/resend   send the confirmation again
 *   POST   /api/auth/password/forgot email a reset link (same answer whether or not the account exists)
 *   POST   /api/auth/password/reset  set a new password from the emailed link
 */
const router = Router();

/** The PIN and passwords are guessable by brute force; everything that checks one is throttled. */
const pinLimiter = rateLimit({ windowMs: 60_000, limit: 5, message: { error: 'Too many attempts. Try again in a minute.' } });
const credentialLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  message: { error: 'Too many attempts. Wait fifteen minutes, then try again.' },
  // The suite signs up dozens of accounts from one address in a few seconds.
  skip: () => process.env.NODE_ENV === 'test',
});

// Asking for email is cheap for a caller and costs the sender's reputation.
const emailLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  message: { error: 'Too many emails asked for. Try again in an hour.' },
  skip: () => process.env.NODE_ENV === 'test',
});

/** Where links in emails point: the configured site, or the address this request came to. */
const origin = (req: Request) => process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;

async function sendVerification(req: Request, user: { _id: string; email: string }) {
  const token = await issueToken(user._id, 'verify');
  return sendEmail(verificationEmail(user.email, `${origin(req)}/verify?token=${token}`));
}

const fail = (res: Response, err: unknown) => {
  if (err instanceof AccountError) return res.status(err.status).json({ error: err.message, field: err.field });
  // A duplicate key: two sign-ups racing for the same email or handle.
  if ((err as { code?: number }).code === 11000) {
    const field = Object.keys((err as { keyPattern?: object }).keyPattern ?? {})[0];
    return res.status(409).json({
      error: field === 'handle' ? 'That handle is taken. Pick another.' : 'An account with that email already exists. Sign in instead.',
      field,
    });
  }
  res.status(500).json({ error: (err as Error).message });
};

const guard = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, _next: NextFunction) => handler(req, res).catch((err) => fail(res, err));

// POST /api/auth/pin
router.post('/pin', pinLimiter, guard(async (req, res) => {
  const configured = process.env.ADMIN_PIN;
  if (configured && req.body?.pin !== configured) return res.status(401).json({ error: 'Invalid PIN' });
  res.json({ token: await createSession({ kind: 'operator' }) });
}));

// POST /api/auth/signup
router.post('/signup', credentialLimiter, guard(async (req, res) => {
  const email = normaliseEmail(req.body?.email);
  checkEmail(email);
  const handle = checkHandle(req.body?.handle);
  const password = checkPassword(req.body?.password);
  if (await User.exists({ email })) throw new AccountError('An account with that email already exists. Sign in instead.', 409, 'email');
  if (await User.exists({ handle })) throw new AccountError('That handle is taken. Pick another.', 409, 'handle');

  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim().slice(0, 60) : '';
  const user = await User.create({ email, handle, displayName, passwordHash: await hashPassword(password) });
  const token = await createSession({ kind: 'user', userId: user._id });
  // Best-effort: the account exists whether or not the email goes out.
  const verificationSent = await sendVerification(req, user).catch(() => false);
  res.status(201).json({ token, user: privateUser(user), verificationSent });
}));

// POST /api/auth/login
router.post('/login', credentialLimiter, guard(async (req, res) => {
  const email = normaliseEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = email ? await User.findOne({ email }) : null;
  // One answer for "no such account" and "wrong password", so the form can't be
  // used to find out who has an account.
  if (!(await checkPasswordAgainst(user?.passwordHash ?? null, password)) || !user) {
    return res.status(401).json({ error: "That email and password don't match an account." });
  }
  const token = await createSession({ kind: 'user', userId: user._id });
  res.json({ token, user: privateUser(user) });
}));

// POST /api/auth/logout
router.post('/logout', guard(async (req, res) => {
  await endSession(bearerToken(req));
  res.json({ ok: true });
}));

// GET /api/auth/me
router.get('/me', requireUser, (req: Request, res: Response) => {
  res.json(privateUser(req.user));
});

// PATCH /api/auth/me
router.patch('/me', requireUser, guard(async (req, res) => {
  const user = req.user;
  const { displayName, bio, handle } = req.body ?? {};
  if (typeof displayName === 'string') user.displayName = displayName.trim().slice(0, 60);
  if (typeof bio === 'string') user.bio = bio.trim().slice(0, 280);
  if (handle !== undefined) {
    const next = checkHandle(handle);
    if (next !== user.handle && (await User.exists({ handle: next }))) {
      throw new AccountError('That handle is taken. Pick another.', 409, 'handle');
    }
    user.handle = next;
  }
  await user.save();
  res.json(privateUser(user));
}));

// POST /api/auth/password
router.post('/password', requireUser, credentialLimiter, guard(async (req, res) => {
  const user = req.user;
  if (!(await checkPasswordAgainst(user.passwordHash, String(req.body?.current ?? '')))) {
    throw new AccountError("That isn't the current password.", 401, 'current');
  }
  user.passwordHash = await hashPassword(checkPassword(req.body?.next));
  await user.save();
  // Every other device is signed out; this one gets a fresh session.
  await endUserSessions(user._id);
  res.json({ token: await createSession({ kind: 'user', userId: user._id }) });
}));

// GET /api/auth/export
router.get('/export', requireUser, guard(async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=proof-account.json');
  res.json(await exportAccount(req.user));
}));

// DELETE /api/auth/me
router.delete('/me', requireUser, credentialLimiter, guard(async (req, res) => {
  const user = req.user;
  if (!(await checkPasswordAgainst(user.passwordHash, String(req.body?.password ?? '')))) {
    throw new AccountError("That isn't the account's password. Nothing was deleted.", 401, 'password');
  }
  await deleteAccount(user);
  res.json({ ok: true });
}));

// POST /api/auth/verify/resend
router.post('/verify/resend', requireUser, emailLimiter, guard(async (req, res) => {
  if (req.user.emailVerifiedAt) return res.json({ sent: false, alreadyConfirmed: true });
  const sent = await sendVerification(req, req.user);
  if (!sent) {
    return res.status(503).json({
      error: emailConfigured()
        ? "The email couldn't be sent just now. Try again in a few minutes."
        : "This Proof site can't send email yet. Ask its operator to confirm your account.",
    });
  }
  res.json({ sent: true });
}));

// POST /api/auth/verify
router.post('/verify', guard(async (req, res) => {
  const userId = await redeemToken(req.body?.token, 'verify');
  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    return res.status(400).json({ error: 'That link has expired or was already used. Send a new one from Settings → Account.' });
  }
  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await user.save();
  }
  res.json({ user: privateUser(user) });
}));

// POST /api/auth/password/forgot
router.post('/password/forgot', emailLimiter, guard(async (req, res) => {
  const email = normaliseEmail(req.body?.email);
  const user = email ? await User.findOne({ email }) : null;
  if (user) {
    const token = await issueToken(user._id, 'reset');
    await sendEmail(resetEmail(user.email, `${origin(req)}/reset?token=${token}`));
  }
  // The same answer either way, so this can't be used to find out who has an account.
  res.json({ ok: true });
}));

// POST /api/auth/password/reset
router.post('/password/reset', credentialLimiter, guard(async (req, res) => {
  const password = checkPassword(req.body?.password);
  const userId = await redeemToken(req.body?.token, 'reset');
  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    return res.status(400).json({ error: 'That link has expired or was already used. Ask for a new one from the sign-in sheet.' });
  }
  user.passwordHash = await hashPassword(password);
  // Following the emailed link proves the address as well.
  if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date();
  await user.save();
  await endUserSessions(user._id);
  res.json({ ok: true });
}));

export default router;
