/*
 * Rewrites the pre-Phase-1 library from ObjectIds to string ids (services/stringIds.ts).
 *
 *   npx tsx scripts/migrate-string-ids.js                 dry run: report only, writes nothing
 *   npx tsx scripts/migrate-string-ids.js --apply         back up every collection, then migrate
 *   ... --owner=<userId>                                  assign records with no owner to that account
 *
 * Run it against a copy of the database first (LAUNCH_PLAN.md, Accepted risk 4).
 * It is idempotent: a second run reports nothing left to do.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { migrateToStringIds, MIGRATED_MODELS } from '../services/stringIds.js';
import { backupCollection } from '../services/libraryPublish.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const ownerArg = args.find((a) => a.startsWith('--owner='));
const ownerId = ownerArg ? ownerArg.split('=')[1] : null;

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  process.stderr.write('MONGO_URI is not set. Put it in server/.env.\n');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
try {
  if (apply) {
    for (const Model of MIGRATED_MODELS) {
      process.stdout.write(`backup: ${await backupCollection(Model.collection.name, path.join(here, '..', 'backups'))}\n`);
    }
  }
  const reports = await migrateToStringIds({ dryRun: !apply, ownerId });
  for (const r of reports) {
    process.stdout.write(`${r.collection}: ${r.total} records · ${r.rewritten} new ids · ${r.updated} fields filled\n`);
  }
  if (!apply) process.stdout.write('Dry run. Nothing was written. Add --apply to migrate.\n');
} finally {
  await mongoose.disconnect();
}
