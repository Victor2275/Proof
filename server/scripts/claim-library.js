/*
 * Makes the operator's account user #1 (services/claimLibrary.ts).
 *
 *   npx tsx scripts/claim-library.js --email=<your account email>            dry run
 *   npx tsx scripts/claim-library.js --email=<your account email> --apply    claim
 *   ... --handle=<handle>                                                     default: proof
 *
 * Sign up in the app first. Run scripts/migrate-string-ids.js before this; it
 * backs up the collections, and this reuses its rewrite to assign owners.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { claimLibrary } from '../services/claimLibrary.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });

const args = process.argv.slice(2);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const email = value('email');
const handle = value('handle') ?? 'proof';
const apply = args.includes('--apply');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri || !email) {
  process.stderr.write('Usage: npx tsx scripts/claim-library.js --email=<account email> [--handle=proof] [--apply]\n(MONGO_URI comes from server/.env.)\n');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
try {
  const r = await claimLibrary({ email, handle, dryRun: !apply });
  process.stdout.write(`@${r.handle}: ${r.published} published recipes · ${r.library} library records\n`);
  if (!apply) process.stdout.write('Dry run. Nothing was written. Add --apply to claim.\n');
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
