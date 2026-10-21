import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { migrateToStringIds, withStringIds } from '../services/stringIds.js';
import { referencedImageUrls } from '../routes/maintenance.js';

let mongoServer;
const raw = (name) => mongoose.connection.collection(name);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  for (const name of ['recipes', 'bakelogs', 'notes', 'pantries']) await raw(name).deleteMany({});
});

/** The library as it was before Phase 1: ObjectIds everywhere, no sync fields. */
async function seedLegacy() {
  const recipeId = new mongoose.Types.ObjectId();
  const frostingId = new mongoose.Types.ObjectId();
  await raw('recipes').insertMany([
    {
      _id: recipeId,
      title: 'Cake',
      instructions: ['Bake.', 'Frost.'],
      instructionLinks: [{ stepIndex: 1, recipeId: frostingId, recipeTitle: 'Frosting' }],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-02-01'),
    },
    { _id: frostingId, title: 'Frosting', instructions: [], createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01') },
  ]);
  await raw('bakelogs').insertOne({ _id: new mongoose.Types.ObjectId(), recipeId, notes: 'Good' });
  await raw('pantries').insertOne({ _id: new mongoose.Types.ObjectId(), name: 'Flour', createdAt: new Date('2025-03-01') });
  return { recipeId: recipeId.toHexString(), frostingId: frostingId.toHexString() };
}

describe('string-id migration', () => {
  it('reports what it would do on a dry run, and writes nothing', async () => {
    await seedLegacy();
    const reports = await migrateToStringIds({ dryRun: true });
    expect(reports.find((r) => r.collection === 'recipes')).toMatchObject({ total: 2, rewritten: 2 });
    const stillObjectId = await raw('recipes').findOne({});
    expect(stillObjectId._id).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it('rewrites every id as its hex string, keeping references pointing at the same records', async () => {
    const { recipeId, frostingId } = await seedLegacy();
    await migrateToStringIds({ dryRun: false });

    const cake = await raw('recipes').findOne({ _id: recipeId });
    expect(cake.title).toBe('Cake');
    expect(cake.instructionLinks[0].recipeId).toBe(frostingId);
    expect(cake.deletedAt).toBeNull();
    expect(await raw('recipes').countDocuments()).toBe(2);

    const log = await raw('bakelogs').findOne({});
    expect(typeof log._id).toBe('string');
    expect(log.recipeId).toBe(recipeId);

    // A pantry item had a createdAt but never an updatedAt; sync needs both.
    const flour = await raw('pantries').findOne({});
    expect(flour.updatedAt).toEqual(flour.createdAt);
  });

  it('assigns unowned records to the named account, and leaves owned ones alone', async () => {
    await seedLegacy();
    await raw('notes').insertOne({ _id: 'n1', title: 'Theirs', ownerId: 'someone-else', deletedAt: null });
    await migrateToStringIds({ dryRun: false, ownerId: 'operator' });

    expect((await raw('recipes').findOne({ title: 'Cake' })).ownerId).toBe('operator');
    expect((await raw('notes').findOne({ _id: 'n1' })).ownerId).toBe('someone-else');
  });

  it('is idempotent: a second run finds nothing left to do', async () => {
    await seedLegacy();
    await migrateToStringIds({ dryRun: false });
    const second = await migrateToStringIds({ dryRun: false });
    expect(second.every((r) => r.rewritten === 0 && r.updated === 0)).toBe(true);
    expect(await raw('recipes').countDocuments()).toBe(2);
  });

  it('leaves an already-migrated document as it is', () => {
    const doc = { _id: 'abc', title: 'x', deletedAt: null, ownerId: null, updatedAt: 1, createdAt: 1 };
    expect(withStringIds(doc, null)).toEqual(doc);
  });
});

describe('orphan image cleanup', () => {
  it("counts a published copy's photographs, and bake photos in either list", () => {
    const urls = referencedImageUrls([
      { imageUrls: ['https://res.cloudinary.com/a.jpg'] },
      { imageUrls: [], images: [{ url: 'https://res.cloudinary.com/b.jpg' }] },
      { imageUrls: ['https://res.cloudinary.com/published-only.jpg'] },
    ]);
    expect([...urls].sort()).toEqual([
      'https://res.cloudinary.com/a.jpg',
      'https://res.cloudinary.com/b.jpg',
      'https://res.cloudinary.com/published-only.jpg',
    ]);
  });
});
