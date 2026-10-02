import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The data axis of the Phase 0 matrix (LAUNCH_PLAN.md, A1).
 *
 *   empty       — a stranger's first session. Nothing anywhere.
 *   typical     — the live library, snapshotted by scripts/audit-snapshot.mjs.
 *                 Not a fixture: the point of A1b is that the real data is what
 *                 the surfaces have to survive.
 *   overflowing — the far edge: 200 recipes, 60-character titles, 40
 *                 ingredients, long steps, a busy bake log, a crowded pantry.
 */

export type Dataset = {
  recipes: Record<string, unknown>[];
  bakelogs: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  pantry: Record<string, unknown>[];
};

export type DatasetName = 'empty' | 'typical' | 'overflowing';

// Playwright runs from the repo root; the package is ESM, so there is no __dirname.
const DATA_DIR = join(process.cwd(), 'e2e', 'audit', '.data');

function loadTypical(): Dataset {
  if (!existsSync(join(DATA_DIR, 'recipes.json'))) {
    throw new Error('No live snapshot. Run `node scripts/audit-snapshot.mjs` first.');
  }
  const read = (name: string) => JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
  return { recipes: read('recipes'), bakelogs: read('bakelogs'), notes: read('notes'), pantry: read('pantry') };
}

const WORDS = [
  'Toasted', 'Brown-Butter', 'Rye', 'Cardamom', 'Laminated', 'Overnight', 'Whole-Wheat',
  'Black Sesame', 'Miso', 'Caramelised', 'Seeded', 'Spelt', 'Honey', 'Pistachio',
];

/** Exactly `n` characters, built from words rather than padding, so it wraps like a title does. */
function title(i: number, n = 60) {
  let s = '';
  for (let w = i; s.length < n; w++) s += `${WORDS[w % WORDS.length]} `;
  return s.slice(0, n).trimEnd();
}

function overflowing(): Dataset {
  const recipes = Array.from({ length: 200 }, (_, i) => ({
    _id: `r-over-${i}`,
    title: title(i),
    description:
      'An unreasonably long description that a stranger pasted in from somewhere, running on well past the point any card was designed to hold, because nobody stops them.',
    imageUrls: [`https://fixture.test/over-${i}.jpg`],
    servings: 24,
    difficulty: 'Hard',
    prepTime: `${45 + i} mins`,
    cookTime: '1 hour 15 mins',
    tags: ['Viennoiserie', 'Long-fermented', 'Competition', 'Experimental', 'Holiday-baking'],
    folder: i % 2 ? 'An Extremely Long Folder Name For Testing' : `Folder ${i % 17}`,
    ingredients: Array.from({ length: 40 }, (_, j) => ({
      name: `${title(j + i, 34)} (sifted, at room temperature)`,
      quantity: 1234.5 + j,
      unit: j % 3 ? 'tablespoons' : 'g',
    })),
    instructions: Array.from(
      { length: 30 },
      (_, j) =>
        `Step ${j + 1}: fold the dough gently for 15-18 minutes, then rest it for 45 minutes at 24C, checking that it has risen by about half before you move on — if it has not, give it another 30 minutes and look again.`,
    ),
    instructionLinks: [],
    labNotes: 'Notes '.repeat(200),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }));

  const bakelogs = Array.from({ length: 60 }, (_, i) => ({
    _id: `b-over-${i}`,
    recipeId: { _id: `r-over-${i % 5}`, title: recipes[i % 5].title },
    date: new Date(Date.UTC(2026, 8, 17) - i * 86_400_000 * 3).toISOString(),
    notes: 'Crumb tighter than last time; the bulk ran cold. '.repeat(8),
    images: [
      { url: `https://fixture.test/bake-${i}-a.jpg`, label: 'Dough' },
      { url: `https://fixture.test/bake-${i}-b.jpg`, label: 'Crumb' },
    ],
    imageUrls: [],
    isPersonalBest: i === 7,
  }));

  const notes = Array.from({ length: 30 }, (_, i) => ({
    _id: `n-over-${i}`,
    title: title(i + 3, 60),
    content: 'Fed at 0700. Doubled by 1130, so roughly 4.5h at 22C. '.repeat(40),
    updatedAt: '2026-09-10T00:00:00.000Z',
  }));

  const pantry = Array.from({ length: 80 }, (_, i) => ({
    _id: `p-over-${i}`,
    name: `${title(i, 40)} flour`,
  }));

  return { recipes, bakelogs, notes, pantry };
}

let typicalCache: Dataset | undefined;
const overflowingData = overflowing();

export function dataset(name: DatasetName): Dataset {
  if (name === 'empty') return { recipes: [], bakelogs: [], notes: [], pantry: [] };
  if (name === 'overflowing') return overflowingData;
  return (typicalCache ??= loadTypical());
}

/**
 * Which recipe a :id route opens, per dataset. For the live library it is the
 * recipe with a bake log against it, so the iteration surfaces have something
 * real to show; for the empty library it is an id that does not exist, which is
 * what a stale or shared link to a deleted recipe looks like.
 */
export function recipeIdFor(name: DatasetName): string {
  if (name === 'empty') return 'missing-recipe';
  if (name === 'overflowing') return 'r-over-0';
  const data = dataset('typical');
  const logged = data.bakelogs
    .map((b) => b.recipeId as string | { _id: string })
    .map((r) => (typeof r === 'string' ? r : r._id))
    .find((id) => data.recipes.some((r) => r._id === id));
  return logged ?? (data.recipes[0]._id as string);
}
