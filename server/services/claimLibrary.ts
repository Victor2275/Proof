/*
 * The operator becomes user #1 (LAUNCH_PLAN.md, Phase 2 item 6).
 *
 * The seeded library was published under the handle "proof" before accounts
 * existed, so its copies have no author account, and the pre-Phase-1 records
 * have no owner. Claiming gives the operator's account the reserved handle,
 * makes it the author of every copy published under that handle, and the
 * owner of every unowned library record — so the seeded recipes are the
 * operator's to edit and unpublish like anyone else's.
 */
import { User } from '../models/User.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { migrateToStringIds } from './stringIds.js';

export interface ClaimResult {
  handle: string;
  published: number;
  library: number;
}

export async function claimLibrary({ email, handle = 'proof', dryRun = true }: { email: string; handle?: string; dryRun?: boolean }) {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) throw new Error(`No account has the email ${email}. Sign up in the app first, then claim.`);

  const holder = await User.findOne({ handle, _id: { $ne: user._id } });
  if (holder) throw new Error(`@${handle} already belongs to another account (${holder.email}).`);

  const published = await PublishedRecipe.countDocuments({ authorHandle: user.handle === handle ? handle : { $in: [handle, user.handle] }, authorId: null });
  const library = (await migrateToStringIds({ dryRun: true, ownerId: user._id })).reduce((n, r) => n + r.updated + r.rewritten, 0);
  if (dryRun) return { handle, published, library } satisfies ClaimResult;

  if (user.handle !== handle) {
    // Copies already published under the account's old handle follow it.
    await PublishedRecipe.updateMany({ authorId: user._id }, { $set: { authorHandle: handle } });
    user.handle = handle;
    await user.save();
  }
  const claimed = await PublishedRecipe.updateMany({ authorHandle: handle, authorId: null }, { $set: { authorId: user._id } });
  await migrateToStringIds({ dryRun: false, ownerId: user._id });
  return { handle, published: claimed.modifiedCount, library } satisfies ClaimResult;
}
