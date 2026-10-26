/*
 * The owner account (models/User.js): what scripts/make-owner.js does, kept
 * here so it can be tested without a shell.
 */
import { User } from '../models/User.js';
import { liftSuspension } from './accounts.js';
import { logAction, type Staff } from './moderationLog.js';

type UserDoc = InstanceType<typeof User>;

/** A script run on the server acts as the operator in the log. */
const SCRIPT: Staff = { kind: 'operator', userId: null, handle: '' };

/** Makes `user` the owner — confirmed, unsuspended, Pro with no end date — and says what changed. */
export async function makeOwner(user: UserDoc): Promise<string[]> {
  const said: string[] = [];
  const label = `@${user.handle}`;

  if (user.suspendedAt) {
    await liftSuspension(user);
    await logAction(SCRIPT, { action: 'account.unsuspend', targetType: 'account', targetId: user._id, label });
    said.push(`${label}'s suspension is lifted.`);
  }
  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await logAction(SCRIPT, { action: 'account.confirm', targetType: 'account', targetId: user._id, label });
    said.push(`${label} is confirmed.`);
  }
  if (user.plan !== 'pro' || user.planExpiresAt) {
    user.plan = 'pro';
    user.planExpiresAt = null;
    said.push(`${label} is on Pro, with no end date.`);
  }

  const previous = await User.find({ role: 'owner', _id: { $ne: user._id } });
  for (const old of previous) {
    old.role = 'moderator';
    await old.save();
    said.push(`@${old.handle} is no longer the owner, and stays a moderator.`);
  }

  if (user.role === 'owner') {
    said.push(`${label} was already the owner.`);
  } else {
    user.role = 'owner';
    await logAction(SCRIPT, { action: 'account.promote', targetType: 'account', targetId: user._id, label, reason: 'Made the owner' });
    said.push(`${label} is the owner.`);
  }
  await user.save();
  return said;
}
