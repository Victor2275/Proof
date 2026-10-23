import { describe, it, expect } from 'vitest';
import { bakedPhrase, chapters, filterRecipes, indexByLetter, missingFromPantry, NO_FILTER, readBakes, searchBakeNotes, searchRecipes, sortRecipes, tileCaption, whenBaked } from './cookbook';
import { makeBakeLog, makePantryItem, makeRecipe } from '../test/utils';

const NOW = Date.parse('2026-10-22T12:00:00.000Z');
const A = makeRecipe({ _id: 'a', title: 'The Apple Pie', folder: 'Desserts', createdAt: '2026-01-01T00:00:00.000Z', ingredients: [{ name: 'Apples', quantity: 6, unit: '' }] });
const B = makeRecipe({ _id: 'b', title: 'Brioche', folder: 'Breads', createdAt: '2026-03-01T00:00:00.000Z', tags: ['Favorite'], ingredients: [{ name: 'Butter', quantity: 100, unit: 'g' }, { name: 'Flour', quantity: 500, unit: 'g' }, { name: 'Eggs', quantity: 3, unit: '' }] });
const C = makeRecipe({ _id: 'c', title: 'Éclairs', folder: 'Desserts', createdAt: '2026-02-01T00:00:00.000Z' });

describe('reading the bake log', () => {
  const readings = readBakes([
    makeBakeLog({ _id: '1', recipeId: 'b', date: '2026-10-20T00:00:00.000Z', rating: 4 }),
    makeBakeLog({ _id: '2', recipeId: 'b', date: '2026-10-01T00:00:00.000Z', rating: 2, isPersonalBest: true }),
    makeBakeLog({ _id: '3', recipeId: 'a', date: '2026-09-01T00:00:00.000Z' }),
  ]);

  it('knows when each recipe was last baked, its average stars and whether it has a best', () => {
    expect(readings.get('b')).toEqual({ bakes: 2, lastBaked: '2026-10-20T00:00:00.000Z', rating: 3, hasBest: true });
    expect(readings.get('a')?.rating).toBeNull();
  });

  it('prints when, in a cook’s words', () => {
    expect(whenBaked('2026-10-22T08:00:00.000Z', NOW)).toBe('Today');
    expect(whenBaked('2026-10-21T08:00:00.000Z', NOW)).toBe('Yesterday');
    expect(whenBaked('2026-10-19T08:00:00.000Z', NOW)).toBe('3 days ago');
    expect(whenBaked('2026-10-08T08:00:00.000Z', NOW)).toBe('2 weeks ago');
  });

  it('gives a tile its chapter until it has been baked', () => {
    expect(tileCaption(C, readings.get('c') ?? { bakes: 0, lastBaked: null, rating: null, hasBest: false })).toBe('Desserts');
    expect(tileCaption(B, readings.get('b')!)).toMatch(/^Baked .* · ★3$/);
  });

  it('sorts by rating with the unrated after the rated, and by recently baked with the never-baked last', () => {
    // Unrated ones in title order: "Éclairs" before "The Apple Pie".
    expect(sortRecipes([A, B, C], 'rating', readings).map((r) => r._id)).toEqual(['b', 'c', 'a']);
    expect(sortRecipes([A, B, C], 'baked', readings).map((r) => r._id)).toEqual(['b', 'a', 'c']);
    expect(sortRecipes([A, B, C], 'recent', readings).map((r) => r._id)).toEqual(['b', 'c', 'a']);
  });
});

describe('the contents and the index', () => {
  it('counts chapters, largest first', () => {
    expect(chapters([A, B, C])).toEqual([
      { name: 'Desserts', count: 2 },
      { name: 'Breads', count: 1 },
    ]);
  });

  it('files a recipe under its first real letter, ignoring "The" and accents', () => {
    expect(indexByLetter([A, B, C]).map((g) => [g.letter, g.recipes.map((r) => r._id)])).toEqual([
      ['A', ['a']],
      ['B', ['b']],
      ['E', ['c']],
    ]);
  });
});

describe('filtering', () => {
  const none = { readings: new Map(), publishedIds: new Set<string>(), pantry: [] };
  it('keeps the favourites, a chapter, or what the cupboard can nearly make', () => {
    expect(filterRecipes([A, B, C], { ...NO_FILTER, favourites: true }, none).map((r) => r._id)).toEqual(['b']);
    expect(filterRecipes([A, B, C], { ...NO_FILTER, chapter: 'Desserts' }, none).map((r) => r._id)).toEqual(['a', 'c']);
    const pantry = [makePantryItem({ name: 'Flour' })];
    expect(missingFromPantry(B, pantry)).toBe(2);
    expect(filterRecipes([A, B], { ...NO_FILTER, canMake: true }, { ...none, pantry }).map((r) => r._id)).toEqual(['a', 'b']);
  });
});

describe('search', () => {
  it('finds a recipe by an ingredient', () => {
    expect(searchRecipes([A, B, C], 'butter').map((r) => r._id)).toEqual(['b']);
  });

  it('finds bakes by their notes, changes and step notes, with a line of context', () => {
    const logs = [
      makeBakeLog({ _id: 'x', recipeId: 'b', notes: 'The crumb was tight; more hydration next time.' }),
      makeBakeLog({ _id: 'y', recipeId: 'b', stepNotes: [{ stepIndex: 0, text: 'Hydration felt low', at: '' }] }),
    ];
    const hits = searchBakeNotes(logs, new Map([['b', B]]), 'hydration');
    expect(hits.map((h) => h.log._id)).toEqual(['x', 'y']);
    expect(hits[0].snippet).toContain('more hydration next time');
  });
});

describe('the baked phrase', () => {
  it('keeps a month capitalised and a relative day in sentence case', () => {
    expect(bakedPhrase('2026-10-19T08:00:00.000Z', NOW)).toBe('baked 3 days ago');
    expect(bakedPhrase('2026-09-16T08:00:00.000Z', NOW)).toMatch(/^baked on Sep 16$/);
  });
});
