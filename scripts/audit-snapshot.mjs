/*
 * Snapshots the live library for the Phase 0 UI audit (LAUNCH_PLAN.md, A1b).
 *
 * The audit's "typical" column has to be the real data — 203 recipes, most of
 * them carrying the seed script's placeholder timings, and three bake logs —
 * because a clean fixture hides exactly the defects a stranger would see. This
 * reads the public GET endpoints only and writes them to e2e/audit/.data/,
 * which is gitignored: the snapshot is an input to a run, not source.
 *
 *   node scripts/audit-snapshot.mjs [baseUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] ?? 'https://proof-cdvj.onrender.com').replace(/\/$/, '');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'e2e', 'audit', '.data');

// Render's free tier sleeps; the first request can take most of a minute.
const read = async (path) => {
  const res = await fetch(`${base}/api/${path}`, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`GET /api/${path} answered ${res.status}`);
  return res.json();
};

await mkdir(out, { recursive: true });
for (const name of ['recipes', 'bakelogs', 'notes', 'pantry']) {
  const data = await read(name);
  await writeFile(join(out, `${name}.json`), JSON.stringify(data));
  process.stdout.write(`${name}: ${Array.isArray(data) ? data.length : '?'} records\n`);
}
await writeFile(join(out, 'taken.json'), JSON.stringify({ base, takenAt: new Date().toISOString() }));
