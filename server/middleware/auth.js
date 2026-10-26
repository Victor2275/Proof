import crypto from 'crypto';
import mongoose from 'mongoose';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';

/*
 * Who is calling.
 *
 * One kind of session: an account's, an opaque 256-bit token sent as a bearer
 * header. What an account may do follows from its role — a moderator works
 * the queue, and the owner also holds the site's tools. There is no PIN.
 *
 * A bearer header rather than a cookie because the Android app is a WebView
 * on another origin, where Android blocks third-party cookies by default; a
 * header works the same from the web and the app, and carries no CSRF risk.
 *
 * The cookbook itself needs neither: it never reaches the server.
 */

export const USER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const bearerToken = (req) => {
  const header = req.headers.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

export async function createSession({ userId }) {
  const token = crypto.randomBytes(32).toString('base64url');
  await Session.create({ _id: hashToken(token), kind: 'user', userId, expiresAt: new Date(Date.now() + USER_SESSION_MS) });
  return token;
}

/** The live session a token names, or null. Expired sessions are refused before the TTL sweep removes them. */
export async function readSession(token) {
  if (!token || mongoose.connection.readyState !== 1) return null;
  const session = await Session.findById(hashToken(token)).lean();
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session;
}

export async function endSession(token) {
  if (token) await Session.deleteOne({ _id: hashToken(token) });
}

export async function endUserSessions(userId) {
  await Session.deleteMany({ kind: 'user', userId });
}

const unavailable = (res) =>
  res.status(503).json({ error: 'Sign-in is unavailable right now. Your cookbook is unaffected; try again shortly.', degraded: true });

/** The signed-in, unsuspended account calling, or null. */
async function callerOf(req) {
  const session = await readSession(bearerToken(req));
  const user = session?.kind === 'user' ? await User.findById(session.userId) : null;
  return user && !user.suspendedAt ? user : null;
}

export const isStaff = (user) => user?.role === 'moderator' || user?.role === 'owner';

/*
 * The owner account: the site's tools — backups, the server library, photo
 * re-hosting — and making moderators. Sets req.user and req.staff.
 *
 * Another account gets 403, not 401: its session is fine, and a 401 would
 * sign the device out.
 */
export const requireOwner = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return unavailable(res);
  const user = await callerOf(req);
  if (user?.role === 'owner') {
    req.user = user;
    req.staff = { kind: 'owner', userId: user._id, handle: user.handle };
    return next();
  }
  if (!user) return res.status(401).json({ error: 'Sign in as the owner to do that.' });
  res.status(403).json({ error: "That is for the site's owner." });
};

/**
 * Sets req.user when a signed-in account is calling; never refuses. A
 * suspended account is treated as signed out, in case a session outlived the
 * suspension.
 */
export const loadUser = async (req, _res, next) => {
  req.user = null;
  const session = await readSession(bearerToken(req)).catch(() => null);
  if (session?.kind === 'user') {
    const user = await User.findById(session.userId);
    req.user = user && !user.suspendedAt ? user : null;
  }
  next();
};

/*
 * A moderator or the owner: the moderation queue, accounts, the log. Sets
 * req.staff (services/moderationLog.ts) to say who, for the log. Refuses as
 * requireOwner does.
 */
export const requireModerator = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return unavailable(res);
  const user = await callerOf(req);
  if (isStaff(user)) {
    req.user = user;
    req.staff = { kind: user.role, userId: user._id, handle: user.handle };
    return next();
  }
  if (!user) return res.status(401).json({ error: 'Sign in as a moderator to do that.' });
  res.status(403).json({ error: 'That needs a moderator account.' });
};

export const requireUser = [
  loadUser,
  (req, res, next) => {
    if (req.user) return next();
    if (mongoose.connection.readyState !== 1) return unavailable(res);
    res.status(401).json({ error: 'Sign in to do that.', account: true });
  },
];

/** An account whose email has been confirmed: the gate for anything other people will see. */
export const requireVerified = [
  ...requireUser,
  (req, res, next) => {
    if (req.user.emailVerifiedAt) return next();
    res.status(403).json({ error: 'Confirm your email address first. The link is in the message we sent when you signed up.', unverified: true });
  },
];
