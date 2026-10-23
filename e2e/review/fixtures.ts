import { dataset, publishedFrom } from '../audit/datasets.ts';
import type { ReviewServer } from './api.ts';

/*
 * The two people a /ui-review run reviews as, and the server they meet.
 *
 *   stranger — nothing on the device.
 *   regular  — the live library (e2e/audit/.data, `npm run audit:snapshot`)
 *              plus a believable bake history. The live data holds three bake
 *              logs, too few to judge the iteration surfaces by.
 *
 * Bake photographs are borrowed from *other* recipes in the same folder, and
 * only every other bake has one. The 2026-10-21 audit reused each recipe's own photo
 * for its bakes, and reviewers filed the duplicate as a bug.
 */

const typical = dataset('typical');
export const shared = publishedFrom(typical.recipes);
export const sharedSlug = String(shared[0].slug);

const photographed = typical.recipes.filter((r) => Array.isArray(r.imageUrls) && (r.imageUrls as string[]).length);
const baked = photographed.slice(0, 3);
const photoOf = (r: Record<string, unknown>) => (r.imageUrls as string[])[0];
/** Photos of other recipes in the same folder, so a cheesecake's bakes look like desserts rather than stir-fries. */
const borrowedFor = (r: Record<string, unknown>) => {
  const kin = photographed.filter((o) => o !== r && o.folder === r.folder && !baked.includes(o));
  return (kin.length ? kin : photographed.slice(3, 9)).slice(0, 4).map(photoOf);
};

const NOTES = [
  'Bulk ran warm (26C) — over-proofed slightly, crumb open but flat. Next: cooler water.',
  'Cut hydration to 72%. Much better shape, ear on two loaves.',
  'Swapped 10% for rye. Flavour deeper, a touch dense. Keep.',
  'Personal best — even crumb, crackling crust. Baked 20 min lid on, 22 off.',
  'Rushed the preshape. Spread in the oven.',
  'Tried a longer cold retard (16h). Sourer, blistered crust.',
];

const history = Array.from({ length: 14 }, (_, i) => {
  const r = baked[i % baked.length];
  const borrowed = borrowedFor(r);
  return {
    _id: `b-review-${i}`,
    recipeId: { _id: r._id, title: r.title },
    date: new Date(Date.UTC(2026, 9, 18) - i * 86_400_000 * 4).toISOString(),
    notes: NOTES[i % NOTES.length],
    images: i % 2 ? [] : [{ url: borrowed[i % borrowed.length], label: 'Crumb' }],
    imageUrls: [],
    rating: 3 + (i % 3),
    isPersonalBest: i === 3,
  };
});

export const people = {
  stranger: { recipes: [], bakeLogs: [], notes: [], pantry: [] },
  regular: { recipes: typical.recipes, bakeLogs: [...typical.bakelogs, ...history], notes: typical.notes, pantry: typical.pantry },
};

/** The recipe with the deepest bake history: the one the Mid-Bake Baker is on attempt five of. */
export const regularRecipeId = String(baked[0]._id);

// An import arrives without an id; the editor gives it one on save.
const importable = { ...photographed[photographed.length - 1] };
delete importable._id;
export const server: ReviewServer = { shared, extracted: importable };
