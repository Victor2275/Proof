/*
 * Account email: confirm an address, reset a password (LAUNCH_PLAN.md, Phase 2
 * item 3).
 *
 * Sent through Resend's HTTP API. Resend sends only from a domain whose DNS is
 * yours; until Proof has one (§3, deferred), the default sender is Resend's
 * test address, which delivers only to the Resend account's own inbox. So an
 * unsent email is an ordinary outcome, not an error: the caller is told, and
 * the operator can confirm an account by hand (scripts/verify-account.js).
 *
 * Nothing here logs an address, a token or a link.
 */
import crypto from 'crypto';
import { EmailToken } from '../models/EmailToken.js';

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

export async function issueToken(userId: string, purpose: 'verify' | 'reset') {
  // One live link per purpose: asking again replaces the last one.
  await EmailToken.deleteMany({ userId, purpose });
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = purpose === 'verify' ? VERIFY_TTL_MS : RESET_TTL_MS;
  await EmailToken.create({ _id: hashToken(token), userId, purpose, expiresAt: new Date(Date.now() + ttl) });
  return token;
}

/** Spends a token: the account it names, or null when it is unknown, used or expired. */
export async function redeemToken(token: unknown, purpose: 'verify' | 'reset'): Promise<string | null> {
  if (typeof token !== 'string' || !token) return null;
  const doc = await EmailToken.findOneAndDelete({ _id: hashToken(token), purpose });
  if (!doc || doc.expiresAt.getTime() <= Date.now()) return null;
  return doc.userId;
}

interface Message {
  to: string;
  subject: string;
  text: string;
}

/** True when Resend accepted the message. */
export async function sendEmail(message: Message): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Proof <onboarding@resend.dev>',
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const verificationEmail = (to: string, link: string): Message => ({
  to,
  subject: 'Confirm your email for Proof',
  text: [
    'Confirm this address to publish recipes and use the AI on Proof:',
    '',
    link,
    '',
    'The link works for a day. If you did not make a Proof account, ignore this email.',
  ].join('\n'),
});

export const resetEmail = (to: string, link: string): Message => ({
  to,
  subject: 'Reset your Proof password',
  text: [
    'Someone asked to reset the password for this Proof account. To choose a new one:',
    '',
    link,
    '',
    'The link works for an hour. If it was not you, ignore this email; your password is unchanged.',
  ].join('\n'),
});
