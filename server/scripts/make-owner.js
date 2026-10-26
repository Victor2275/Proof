/*
 * Makes an account the site's owner: confirmed, Pro with no end date, and the
 * one account that holds the site's tools and makes moderators. There is one
 * owner; naming another account moves the role, and the old owner stays a
 * moderator on the plan it had.
 *
 *   npx tsx scripts/make-owner.js --handle=<handle>
 *   npx tsx scripts/make-owner.js --email=<address>
 *
 * The owner can't be demoted, suspended or signed out from the Moderation
 * page, so this script is the only way the role changes. Each change is
 * written to the moderation log as the operator's (a script run on the server).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { makeOwner } from '../services/owner.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });

const args = process.argv.slice(2);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]?.trim();
const handle = value('handle')?.replace(/^@/, '').toLowerCase();
const email = value('email')?.toLowerCase();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri || (!handle && !email)) {
  process.stderr.write('Usage: npx tsx scripts/make-owner.js --handle=<handle> | --email=<address>\n(MONGO_URI comes from server/.env.)\n');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
try {
  const user = await User.findOne(handle ? { handle } : { email });
  if (!user) {
    process.stderr.write(`No account has the ${handle ? `handle @${handle}` : `email ${email}`}.\n`);
    process.exitCode = 1;
  } else {
    for (const line of await makeOwner(user)) process.stdout.write(`${line}\n`);
  }
} finally {
  await mongoose.disconnect();
}
