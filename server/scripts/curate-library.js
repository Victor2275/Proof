/*
 * Applies the reviewed library edits (data/library-edits.json).
 *
 *   npx tsx scripts/curate-library.js                  dry run: report only, writes nothing
 *   npx tsx scripts/curate-library.js --publish        seed the global cookbook with the publishable recipes
 *   npx tsx scripts/curate-library.js --fix-library    repair the operator's own recipes in place
 *   ... --handle=<name>                                author handle on the published copies (default: proof)
 *
 * Both writes back up the collections they touch to server/backups/ first.
 * --fix-library belongs to the Phase 1 cutover: it writes ingredient amounts
 * of null ("to serve") that the client before Phase 1 draws as "0".
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { planLibrary, summarisePlan, backupCollection, applyLibraryFixes, publishLibrary } from '../services/libraryPublish.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });

const args = process.argv.slice(2);
const doPublish = args.includes('--publish');
const doFix = args.includes('--fix-library');
const handle = (args.find((a) => a.startsWith('--handle=')) ?? '--handle=proof').split('=')[1];

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  process.stderr.write('MONGO_URI is not set. Put it in server/.env.\n');
  process.exit(1);
}

const edits = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'library-edits.json'), 'utf8'));
const backups = path.join(here, '..', 'backups');

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
try {
  const recipes = await mongoose.connection.collection('recipes').find({}).toArray();
  const plan = planLibrary(recipes, edits);
  const summary = summarisePlan(plan);

  process.stdout.write(`${summary.total} recipes · ${summary.curated} reviewed · ${summary.publish} fit to publish\n`);
  for (const w of summary.withheld) process.stdout.write(`  kept private: ${w.title} — ${w.reason}\n`);
  for (const s of summary.skipped) process.stdout.write(`  skipped: ${s.title} — ${s.reason}\n`);

  if (doFix) {
    process.stdout.write(`backup: ${await backupCollection('recipes', backups)}\n`);
    process.stdout.write(`library: ${await applyLibraryFixes(plan)} recipes repaired\n`);
  }
  if (doPublish) {
    process.stdout.write(`backup: ${await backupCollection('publishedrecipes', backups)}\n`);
    const r = await publishLibrary(plan, { handle });
    process.stdout.write(`published as @${handle}: ${r.created} new · ${r.updated} updated · ${r.unpublished} withdrawn\n`);
  }
  if (!doFix && !doPublish) process.stdout.write('Dry run. Nothing was written. Add --publish and/or --fix-library.\n');
} finally {
  await mongoose.disconnect();
}
