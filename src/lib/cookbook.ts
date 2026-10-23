import Fuse from 'fuse.js';
import type { BakeLog, PantryItem, Recipe } from './types';
import { ingredientParts } from './quantities';
import { cleanText } from './recipeText';

/*
 * Reading the cookbook with its bake log (UI overhaul Phase 4, changes 43–56).
 *
 * The cookbook home, its filters and sorts and its search all ask the same few
 * questions of a recipe — when was it last baked, how did it go, is it the one
 * marked best, can it be made from what is in the cupboard — so they are
 * answered here, once, from the records on the device.
 */

/** What the bake log says about one recipe. */
export interface RecipeReading {
  bakes: number;
  /** ISO date of the newest bake, or null if never baked. */
  lastBaked: string | null;
  /** Mean of the rated bakes, or null when none is rated. */
  rating: number | null;
  hasBest: boolean;
}

const NEVER: RecipeReading = { bakes: 0, lastBaked: null, rating: null, hasBest: false };

export function readBakes(bakeLogs: BakeLog[]): Map<string, RecipeReading> {
  const totals = new Map<string, { bakes: number; lastBaked: string | null; sum: number; rated: number; hasBest: boolean }>();
  for (const log of bakeLogs) {
    const t = totals.get(log.recipeId) ?? { bakes: 0, lastBaked: null, sum: 0, rated: 0, hasBest: false };
    t.bakes++;
    if (!t.lastBaked || log.date > t.lastBaked) t.lastBaked = log.date;
    if (log.rating) {
      t.sum += log.rating;
      t.rated++;
    }
    if (log.isPersonalBest) t.hasBest = true;
    totals.set(log.recipeId, t);
  }
  const out = new Map<string, RecipeReading>();
  for (const [id, t] of totals) {
    out.set(id, { bakes: t.bakes, lastBaked: t.lastBaked, rating: t.rated ? t.sum / t.rated : null, hasBest: t.hasBest });
  }
  return out;
}

export const readingOf = (readings: Map<string, RecipeReading>, id: string) => readings.get(id) ?? NEVER;

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", "Mar 4". */
export function whenBaked(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} ${days < 14 ? 'week' : 'weeks'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "baked today", "baked 3 days ago", "baked on Sep 16": for the middle of a sentence. */
export function bakedPhrase(iso: string, now = Date.now()): string {
  const when = whenBaked(iso, now);
  return /^(Today|Yesterday|\d)/.test(when) ? `baked ${when.charAt(0).toLowerCase()}${when.slice(1)}` : `baked on ${when}`;
}

/** A tile's line: last baked and stars when baked, else its chapter (change 51). */
export function tileCaption(recipe: Pick<Recipe, 'folder'>, reading: RecipeReading): string {
  if (reading.lastBaked) {
    const stars = reading.rating ? ` · ★${Math.round(reading.rating * 10) / 10}` : '';
    const phrase = bakedPhrase(reading.lastBaked);
    return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}${stars}`;
  }
  return recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : 'Not baked yet';
}

/* ── Sorting (change 53) ──────────────────────────────────────────────── */

export type SortKey = 'recent' | 'az' | 'baked' | 'rating';

export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recently added' },
  { value: 'az', label: 'A–Z' },
  { value: 'baked', label: 'Recently baked' },
  { value: 'rating', label: 'Rating' },
];

export function sortRecipes(recipes: Recipe[], key: SortKey, readings: Map<string, RecipeReading>): Recipe[] {
  const list = [...recipes];
  const title = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  switch (key) {
    case 'az':
      return list.sort(title);
    case 'baked':
      // Baked ones newest first; the never-baked keep their alphabetical order after them.
      return list.sort((a, b) => {
        const x = readingOf(readings, a._id).lastBaked ?? '';
        const y = readingOf(readings, b._id).lastBaked ?? '';
        return y.localeCompare(x) || title(a, b);
      });
    case 'rating':
      // Unrated recipes after rated ones, never as if they were rated zero.
      return list.sort((a, b) => {
        const x = readingOf(readings, a._id).rating;
        const y = readingOf(readings, b._id).rating;
        if (x === null && y === null) return title(a, b);
        if (x === null) return 1;
        if (y === null) return -1;
        return y - x || title(a, b);
      });
    default:
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || title(a, b));
  }
}

/* ── Filtering (change 52) ────────────────────────────────────────────── */

export interface CookbookFilter {
  chapter: string | null;
  difficulty: string | null;
  baked: 'any' | 'baked' | 'not-yet';
  favourites: boolean;
  published: boolean;
  /** Only recipes the cupboard nearly covers: at most this many missing. */
  canMake: boolean;
}

export const NO_FILTER: CookbookFilter = {
  chapter: null,
  difficulty: null,
  baked: 'any',
  favourites: false,
  published: false,
  canMake: false,
};

/** How many filters are on, for the button's count. */
export function activeFilters(f: CookbookFilter): number {
  return [f.chapter, f.difficulty, f.baked !== 'any', f.favourites, f.published, f.canMake].filter(Boolean).length;
}

/** "Can make now" allows two things to pick up on the way. */
export const CAN_MAKE_MISSING = 2;

/** How many of a recipe's ingredients the cupboard does not have. */
export function missingFromPantry(recipe: Pick<Recipe, 'ingredients'>, pantry: PantryItem[]): number {
  if (!pantry.length) return recipe.ingredients.length;
  const fuse = new Fuse(pantry, { keys: ['name'], threshold: 0.35 });
  return recipe.ingredients.filter((ing) => !fuse.search(ingredientParts(cleanText(ing.name)).name).length).length;
}

export function filterRecipes(
  recipes: Recipe[],
  f: CookbookFilter,
  { readings, publishedIds, pantry }: { readings: Map<string, RecipeReading>; publishedIds: Set<string>; pantry: PantryItem[] },
): Recipe[] {
  return recipes.filter((r) => {
    if (f.chapter && (r.folder || 'Uncategorized') !== f.chapter) return false;
    if (f.difficulty && (r.difficulty || 'Medium') !== f.difficulty) return false;
    const baked = readingOf(readings, r._id).bakes > 0;
    if (f.baked === 'baked' && !baked) return false;
    if (f.baked === 'not-yet' && baked) return false;
    if (f.favourites && !r.tags?.includes('Favorite')) return false;
    if (f.published && !publishedIds.has(r._id)) return false;
    if (f.canMake && missingFromPantry(r, pantry) > CAN_MAKE_MISSING) return false;
    return true;
  });
}

/* ── Chapters and the index (changes 47, 48) ──────────────────────────── */

/** Chapters with their counts, largest first; ties alphabetical. */
export function chapters(recipes: Recipe[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of recipes) {
    const name = r.folder || 'Uncategorized';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** The back-of-book index: recipes under their first letter, A to Z, anything else under "#". */
export function indexByLetter(recipes: Recipe[]): { letter: string; recipes: Recipe[] }[] {
  const groups = new Map<string, Recipe[]>();
  for (const r of [...recipes].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))) {
    const first = r.title
      .trim()
      .normalize('NFD')
      .replace(/^(the|a|an)\s+/i, '')
      .charAt(0)
      .toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), r]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([letter, list]) => ({ letter, recipes: list }));
}

/* ── Search (changes 43, 54) ──────────────────────────────────────────── */

export interface NoteMatch {
  log: BakeLog;
  recipe: Recipe;
  /** The part of the note that matched, for a line of context. */
  snippet: string;
}

/** Recipes by title, tags, description and ingredients. */
export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = query.trim();
  if (!q) return recipes;
  const fuse = new Fuse(recipes, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'tags', weight: 1.5 },
      { name: 'ingredients.name', weight: 1 },
      { name: 'description', weight: 0.5 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
  });
  return fuse.search(q).map((r) => r.item);
}

/** Bakes whose notes, changes or note to next time say the words searched for. */
export function searchBakeNotes(bakeLogs: BakeLog[], recipes: Map<string, Recipe>, query: string): NoteMatch[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: NoteMatch[] = [];
  for (const log of bakeLogs) {
    const recipe = recipes.get(log.recipeId);
    if (!recipe) continue;
    const text = [log.notes, log.changes, log.nextTime, ...(log.stepNotes ?? []).map((n) => n.text)].filter(Boolean).join(' · ');
    const at = text.toLowerCase().indexOf(q);
    if (at === -1) continue;
    const start = Math.max(0, at - 30);
    const snippet = `${start > 0 ? '…' : ''}${text.slice(start, at + q.length + 50).trim()}${at + q.length + 50 < text.length ? '…' : ''}`;
    out.push({ log, recipe, snippet });
  }
  return out;
}

/* ── The bake log in one line (change 103) ────────────────────────────── */

/** "17 bakes · 6 recipes · best: Cheesecake", saying only what the log supports. */
export function summaryLine(bakes: BakeLog[], recipes: Map<string, Recipe>): string {
  if (!bakes.length) return '';
  const readings = readBakes(bakes);
  const parts = [`${bakes.length} ${bakes.length === 1 ? 'bake' : 'bakes'}`, `${readings.size} ${readings.size === 1 ? 'recipe' : 'recipes'}`];
  // The best is the highest average, among recipes rated more than once; no rating, no claim.
  const ranked = [...readings.entries()]
    .filter(([id, r]) => r.rating !== null && recipes.has(id) && bakes.filter((b) => b.recipeId === id && b.rating).length >= 2)
    .sort((a, b) => (b[1].rating ?? 0) - (a[1].rating ?? 0));
  // A best is a comparison: it needs two recipes to be better than, and no tie at the top.
  if (readings.size > 1 && ranked.length && (ranked.length === 1 || ranked[0][1].rating !== ranked[1][1].rating)) {
    parts.push(`best: ${recipes.get(ranked[0][0])!.title}`);
  }
  return parts.join(' · ');
}
