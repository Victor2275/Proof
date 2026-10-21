/*
 * Who may use the AI, and how much (LAUNCH_PLAN.md §5: "a small free monthly
 * quota, unlimited on paid").
 *
 * Every AI call costs money, so the routes are open to the site operator, and
 * to accounts with a confirmed email as an allowance of FREE_AI_PER_MONTH
 * actions — import, restructure and substitutions all draw on the one count.
 * A call is charged before it runs and refunded if it fails, so two requests
 * racing cannot both spend the last action, and an outage costs nothing.
 */
import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { bearerToken, readSession } from '../middleware/auth.js';

export const FREE_AI_PER_MONTH = 5;

export const currentPeriod = (now = new Date()) => now.toISOString().slice(0, 7);

type QuotaUser = { plan?: string; aiQuota?: { period?: string; used?: number } };

/** What the account holder sees: used this month, and the limit (null when there is none). */
export function aiAllowance(user: QuotaUser, now = new Date()) {
  const period = currentPeriod(now);
  const used = user.aiQuota?.period === period ? user.aiQuota.used ?? 0 : 0;
  return { used, limit: user.plan === 'pro' ? null : FREE_AI_PER_MONTH, period };
}

/** Spends one action if the month has one left. Atomic, so racing requests cannot overspend. */
export async function chargeAi(userId: string, now = new Date()): Promise<boolean> {
  const period = currentPeriod(now);
  // A new month: the first action of it starts the count again.
  const reset = await User.updateOne(
    { _id: userId, 'aiQuota.period': { $ne: period } },
    { $set: { 'aiQuota.period': period, 'aiQuota.used': 1 } },
  );
  if (reset.modifiedCount === 1) return true;
  const spent = await User.updateOne(
    { _id: userId, 'aiQuota.period': period, 'aiQuota.used': { $lt: FREE_AI_PER_MONTH } },
    { $inc: { 'aiQuota.used': 1 } },
  );
  return spent.modifiedCount === 1;
}

export async function refundAi(userId: string, now = new Date()) {
  await User.updateOne(
    { _id: userId, 'aiQuota.period': currentPeriod(now), 'aiQuota.used': { $gt: 0 } },
    { $inc: { 'aiQuota.used': -1 } },
  );
}

export async function requireAi(req: Request, res: Response, next: NextFunction) {
  // Local development, with no PIN configured: everyone is the operator.
  if (!process.env.ADMIN_PIN) return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "The AI can't be reached right now. Your cookbook is unaffected.", degraded: true });
  }

  const session = await readSession(bearerToken(req)).catch(() => null);
  if (session?.kind === 'operator') return next();

  const user = session?.kind === 'user' ? await User.findById(session.userId) : null;
  if (!user) {
    return res.status(401).json({ error: 'The AI runs on the server, so it needs an account. Sign in to use it.', account: true });
  }
  if (!user.emailVerifiedAt) {
    return res.status(403).json({ error: 'Confirm your email address to use the AI.', unverified: true });
  }
  if (user.plan === 'pro') return next();

  if (!(await chargeAi(user._id))) {
    return res.status(429).json({
      error: "That was the last AI action this month. It resets on the 1st; everything else keeps working.",
      quota: true,
    });
  }
  // A failed call is not a spent one.
  res.on('finish', () => {
    if (res.statusCode >= 400) refundAi(user._id).catch(() => undefined);
  });
  next();
}
