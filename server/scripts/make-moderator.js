/*
 * Makes an account a moderator, confirming its email if it was not yet.
 *
 *   npx tsx scripts/make-moderator.js --handle=<handle>
 *   npx tsx scripts/make-moderator.js --email=<address>
 *   ... --remove                                          back to an ordinary account
 *
 * For the first moderator: after that, moderators make each other from the
 * Accounts tab on the Moderation page. The change is written to the
 * moderation log as the operator's.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { logAction } from '../services/moderationLog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });

const args = process.argv.slice(2);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]?.trim();
const handle = value('handle')?.replace(/^@/, '').toLowerCase();
const email = value('email')?.toLowerCase();
const remove = args.includes('--remove');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri || (!handle && !email)) {
  process.stderr.write('Usage: npx tsx scripts/make-moderator.js --handle=<handle> | --email=<address> [--remove]\n(MONGO_URI comes from server/.env.)\n');
  process.exit(1);
}

const operator = { kind: 'operator', userId: null, handle: '' };

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
try {
  const user = await User.findOne(handle ? { handle } : { email });
  if (!user) {
    process.stderr.write(`No account has the ${handle ? `handle @${handle}` : `email ${email}`}.\n`);
    process.exitCode = 1;
  } else if (remove) {
    if (user.role !== 'moderator') {
      process.stdout.write(`@${user.handle} was not a moderator.\n`);
    } else {
      user.role = 'user';
      await user.save();
      await logAction(operator, { action: 'account.demote', targetType: 'account', targetId: user._id, label: `@${user.handle}` });
      process.stdout.write(`@${user.handle} is no longer a moderator.\n`);
    }
  } else if (user.suspendedAt) {
    process.stderr.write(`@${user.handle} is suspended. Lift the suspension first.\n`);
    process.exitCode = 1;
  } else {
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      await user.save();
      await logAction(operator, { action: 'account.confirm', targetType: 'account', targetId: user._id, label: `@${user.handle}` });
      process.stdout.write(`@${user.handle} is confirmed.\n`);
    }
    if (user.role === 'moderator') {
      process.stdout.write(`@${user.handle} was already a moderator.\n`);
    } else {
      user.role = 'moderator';
      await user.save();
      await logAction(operator, { action: 'account.promote', targetType: 'account', targetId: user._id, label: `@${user.handle}` });
      process.stdout.write(`@${user.handle} is a moderator.\n`);
    }
  }
} finally {
  await mongoose.disconnect();
}
