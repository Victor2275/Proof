/*
 * Confirms an account's email by hand.
 *
 *   npx tsx scripts/verify-account.js --email=<address>
 *
 * For while the site cannot send email (no domain yet, LAUNCH_PLAN.md §3):
 * the operator checks the person is who they say, then confirms them here so
 * they can publish, comment and use the AI.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });

const email = process.argv.slice(2).find((a) => a.startsWith('--email='))?.split('=')[1];
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri || !email) {
  process.stderr.write('Usage: npx tsx scripts/verify-account.js --email=<address>\n(MONGO_URI comes from server/.env.)\n');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
try {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    process.stderr.write(`No account has the email ${email}.\n`);
    process.exitCode = 1;
  } else if (user.emailVerifiedAt) {
    process.stdout.write(`@${user.handle} was already confirmed.\n`);
  } else {
    user.emailVerifiedAt = new Date();
    await user.save();
    process.stdout.write(`@${user.handle} is confirmed.\n`);
  }
} finally {
  await mongoose.disconnect();
}
