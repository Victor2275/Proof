import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { curateRecipe, slugify, publicTags } from '../services/libraryCuration.js';
import { planLibrary, summarisePlan, publishLibrary, applyLibraryFixes } from '../services/libraryPublish.js';
import { ulid, isUlid } from '../services/ulid.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const seedRecipe = (over = {}) => ({
  _id: 'r1',
  title: 'Seed Stew',
  description: 'A delicious British Beef dish.',
  imageUrls: ['https://www.themealdb.com/images/media/meals/x.jpg'],
  servings: 4,
  difficulty: 'Medium',
  prepTime: '20 mins',
  cookTime: '30 mins',
  tags: ['Beef', 'Favorite'],
  folder: 'Beef',
  ingredients: [
    { name: 'Onion', quantity: 1, unit: 'chopped' },
    { name: 'Bread', quantity: 1, unit: 'to serve' },
  ],
  instructions: ['step 1', 'Brown the beef.', 'step 2', 'Simmer for 2 hours.', 'Enjoy'],
  updatedAt: '2026-09-16T18:00:00.000Z',
  ...over,
});

describe('ulid', () => {
  it('mints 26-character, time-ordered ids', () => {
    const a = ulid(1_000);
    const b = ulid(2_000);
    expect(isUlid(a)).toBe(true);
    expect(a < b).toBe(true);
    expect(isUlid('64ab0000000000000000000a')).toBe(false);
  });
});

describe('curateRecipe', () => {
  it('cleans the method and ingredients, then applies the review', () => {
    const c = curateRecipe(seedRecipe(), { basis: '2026-09-16T18:00:00.000Z', prep: 15, cook: 125, serves: 6, description: 'Beef stew.' });
    expect(c.status).toBe('curated');
    expect(c.fields.instructions).toEqual(['Brown the beef.', 'Simmer for 2 hours.']);
    expect(c.fields.ingredients).toEqual([
      { name: 'Onion, chopped', quantity: 1, unit: '' },
      { name: 'Bread, to serve', quantity: null, unit: '' },
    ]);
    expect(c.fields.prepTime).toBe('15');
    expect(c.fields.cookTime).toBe('125');
    expect(c.fields.servings).toBe(6);
    expect(c.publish).toBe(true);
  });

  it('skips a recipe edited after it was reviewed', () => {
    const c = curateRecipe(seedRecipe({ updatedAt: '2026-10-02T00:00:00.000Z' }), { basis: '2026-09-16T18:00:00.000Z', prep: 1 });
    expect(c.status).toBe('skipped');
  });

  it('skips a recipe with no review entry', () => {
    expect(curateRecipe(seedRecipe(), undefined).status).toBe('skipped');
  });

  it('replaces, drops and adds steps by their index in the cleaned method', () => {
    const c = curateRecipe(seedRecipe(), { replaceSteps: { 1: 'Simmer gently for 2 hours.' }, dropSteps: [0], addSteps: ['Serve.'] });
    expect(c.fields.instructions).toEqual(['Simmer gently for 2 hours.', 'Serve.']);
  });

  it('patches and adds ingredients', () => {
    const c = curateRecipe(seedRecipe(), {
      patchIngredients: { 0: { name: 'Red onion, chopped' } },
      addIngredients: [{ name: 'Salt, to taste', quantity: null, unit: '' }],
    });
    expect(c.fields.ingredients.map((i) => i.name)).toEqual(['Red onion, chopped', 'Bread, to serve', 'Salt, to taste']);
  });

  it('carries a withheld recipe, its reason, a publish-only title and the featured mark', () => {
    const c = curateRecipe(seedRecipe(), { publish: false, reason: 'No oven temperature.', publishTitle: 'Plain Stew', featured: true });
    expect(c.publish).toBe(false);
    expect(c.reason).toBe('No oven temperature.');
    expect(c.publishTitle).toBe('Plain Stew');
    expect(c.fields.title).toBe('Seed Stew');
    expect(c.featured).toBe(true);
  });
});

describe('slugify / publicTags', () => {
  it('makes ASCII slugs', () => {
    expect(slugify('Æbleskiver')).toBe('aebleskiver');
    expect(slugify('Chicken wings with cumin, lemon & garlic')).toBe('chicken-wings-with-cumin-lemon-and-garlic');
    expect(slugify('Walnut Roll Gužvara')).toBe('walnut-roll-guzvara');
    expect(slugify('!!!')).toBe('recipe');
  });

  it('keeps private tags off a published copy', () => {
    expect(publicTags(['Beef', 'Favorite', 'favorite'])).toEqual(['Beef']);
  });
});

describe('the reviewed library file', () => {
  const edits = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'library-edits.json'), 'utf8'));
  const entries = Object.values(edits);
  const KEYS = new Set(['basis', 'prep', 'cook', 'serves', 'difficulty', 'description', 'publish', 'reason', 'featured', 'instructions', 'ingredients', 'dropSteps', 'replaceSteps', 'patchIngredients', 'addIngredients', 'addSteps', 'title', 'folder', 'tags', 'publishTitle']);

  it('covers the whole library with known keys only', () => {
    expect(entries.length).toBe(203);
    for (const e of entries) for (const k of Object.keys(e)) expect(KEYS.has(k)).toBe(true);
  });

  it('gives a reason for every recipe it keeps private', () => {
    for (const e of entries) if (e.publish === false) expect(e.reason?.length).toBeGreaterThan(20);
  });

  it('features only recipes it publishes, and never the seed placeholder timing', () => {
    const featured = entries.filter((e) => e.featured);
    expect(featured.length).toBe(8);
    for (const e of featured) expect(e.publish).not.toBe(false);
    for (const e of entries) expect(e.prep === 20 && e.cook === 30).toBe(false);
  });
});

describe('publishing the library', () => {
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ binary: { checkMD5: false } });
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await PublishedRecipe.deleteMany({});
    await mongoose.connection.collection('recipes').deleteMany({});
  });

  const edits = {
    r1: { basis: '2026-09-16T18:00:00.000Z', prep: 15, cook: 125, featured: true },
    r2: { basis: '2026-09-16T18:00:00.000Z', publish: false, reason: 'Missing the oven temperature for the roast.' },
    r3: { basis: '2026-09-16T18:00:00.000Z', publishTitle: 'Seed Stew' },
  };
  const recipes = () => [
    seedRecipe(),
    seedRecipe({ _id: 'r2', title: 'Roast' }),
    seedRecipe({ _id: 'r3', title: 'Seed Stew Again' }),
    seedRecipe({ _id: 'r4', title: 'Added Later' }),
  ];

  it('summarises what it will do', () => {
    const s = summarisePlan(planLibrary(recipes(), edits));
    expect(s).toMatchObject({ total: 4, curated: 3, publish: 2 });
    expect(s.withheld[0].title).toBe('Roast');
    expect(s.skipped[0].title).toBe('Added Later');
  });

  it('creates snapshots with unique slugs, public tags and attribution', async () => {
    const r = await publishLibrary(planLibrary(recipes(), edits), { handle: 'proof' });
    expect(r).toEqual({ created: 2, updated: 0, unpublished: 0 });
    const docs = await PublishedRecipe.find({}).sort({ slug: 1 }).lean();
    expect(docs.map((d) => d.slug)).toEqual(['seed-stew', 'seed-stew-2']);
    expect(isUlid(docs[0]._id)).toBe(true);
    expect(docs[0].tags).toEqual(['Beef']);
    expect(docs[0].sourceAttribution).toBe('TheMealDB');
    expect(docs[0].moderation.state).toBe('approved');
    expect(docs.find((d) => d.sourceLocalId === 'r1').featured).toBe(true);
  });

  it('updates in place on a re-run, and withdraws a recipe the review no longer publishes', async () => {
    await publishLibrary(planLibrary(recipes(), edits), { handle: 'proof' });
    const before = await PublishedRecipe.findOne({ sourceLocalId: 'r1' }).lean();

    const withdrawn = { ...edits, r1: { ...edits.r1, publish: false, reason: 'Withdrawn after a second look.' } };
    const r = await publishLibrary(planLibrary(recipes(), withdrawn), { handle: 'proof' });
    expect(r).toEqual({ created: 0, updated: 1, unpublished: 1 });

    const after = await PublishedRecipe.findOne({ sourceLocalId: 'r1' }).lean();
    expect(after._id).toBe(before._id);
    expect(after.slug).toBe(before.slug);
    expect(after.unpublishedAt).not.toBeNull();
  });

  it('repairs the private records in place and strips the versioning fields', async () => {
    await mongoose.connection.collection('recipes').insertMany(recipes().map((r) => ({ ...r, versionNumber: 1, commitMessage: 'seed' })));
    const stored = await mongoose.connection.collection('recipes').find({}).toArray();
    const changed = await applyLibraryFixes(planLibrary(stored, edits));
    expect(changed).toBe(3);
    const r1 = await mongoose.connection.collection('recipes').findOne({ _id: 'r1' });
    expect(r1.prepTime).toBe('15');
    expect(r1.instructions).toEqual(['Brown the beef.', 'Simmer for 2 hours.']);
    expect(r1.versionNumber).toBeUndefined();
    const r4 = await mongoose.connection.collection('recipes').findOne({ _id: 'r4' });
    expect(r4.prepTime).toBe('20 mins');
  });

  describe('GET /api/published', () => {
    beforeEach(async () => {
      await publishLibrary(planLibrary(recipes(), edits), { handle: 'proof' });
      await PublishedRecipe.create({ authorHandle: 'x', sourceLocalId: 'p', slug: 'pending-one', title: 'Pending' });
    });

    it('lists only approved, live recipes, as summaries', async () => {
      const res = await request(app).get('/api/published');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items[0].instructions).toBeUndefined();
    });

    it('filters to the featured shelf', async () => {
      const res = await request(app).get('/api/published?featured=1');
      expect(res.body.items.map((i) => i.title)).toEqual(['Seed Stew']);
      expect(res.body.total).toBe(1);
    });

    it('returns one recipe by slug or id, with its method', async () => {
      const bySlug = await request(app).get('/api/published/seed-stew');
      expect(bySlug.status).toBe(200);
      expect(bySlug.body.instructions.length).toBeGreaterThan(0);
      const byId = await request(app).get(`/api/published/${bySlug.body._id}`);
      expect(byId.body.slug).toBe('seed-stew');
    });

    it('answers 404 for a pending or unpublished recipe', async () => {
      expect((await request(app).get('/api/published/pending-one')).status).toBe(404);
    });
  });
});
