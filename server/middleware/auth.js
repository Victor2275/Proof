import crypto from 'crypto';
import mongoose from 'mongoose';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';

/*
 * Who is calling.
 *
 * Two kinds of session, both opaque 256-bit tokens sent as a bearer header:
 *
 *   user      an account (Phase 2) — publishing, and later sync
 *   operator  whoever holds ADMIN_PIN — moderation, backups, takedowns
 *
 * A bearer header rather than a cookie because the Android app is a WebView
 * on another origin, where Android blocks third-party cookies by default; a
 * header works the same from the web and the app, and carries no CSRF risk.
 *
 * The cookbook itself needs neither: it never reaches the server.
 */

export const USER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const OPERATOR_SESSION_MS = 24 * 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const bearerToken = (req) => {
  const header = req.headers.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

export async function createSession({ kind, userId = null }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = kind === 'operator' ? OPERATOR_SESSION_MS : USER_SESSION_MS;
  await Session.create({ _id: hashToken(token), kind, userId, expiresAt: new Date(Date.now() + ttl) });
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

/*
 * The site operator: moderation, backups, takedowns. Not a user role — the PIN
 * proves it. With no ADMIN_PIN set (local development) every caller is the
 * operator.
 */
export const requireOperator = async (req, res, next) => {
  if (!process.env.ADMIN_PIN) return next();
  if (mongoose.connection.readyState !== 1) return unavailable(res);
  const session = await readSession(bearerToken(req));
  if (session?.kind === 'operator') return next();
  res.status(401).json({ error: 'That needs the operator PIN.' });
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
 * The operator or a moderator account: the moderation queue, accounts, the
 * log. Sets req.staff (services/moderationLog.ts) to say which, for the log.
 * With no ADMIN_PIN set (local development) every caller is the operator, as
 * for requireOperator.
 *
 * An account that is not a moderator gets 403, not 401: its session is fine,
 * and a 401 would sign the device out.
 */
export const requireModerator = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return unavailable(res);
  const session = await readSession(bearerToken(req));
  const user = session?.kind === 'user' ? await User.findById(session.userId) : null;
  if (user && !user.suspendedAt && user.role === 'moderator') {
    req.user = user;
    req.staff = { kind: 'moderator', userId: user._id, handle: user.handle };
    return next();
  }
  if (session?.kind === 'operator' || !process.env.ADMIN_PIN) {
    req.staff = { kind: 'operator', userId: null, handle: '' };
    return next();
  }
  if (!user || user.suspendedAt) return res.status(401).json({ error: 'Sign in as a moderator to do that.' });
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
