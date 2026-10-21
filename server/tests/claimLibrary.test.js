import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { claimLibrary } from '../services/claimLibrary.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), PublishedRecipe.deleteMany({}), mongoose.connection.collection('recipes').deleteMany({})]);
  await PublishedRecipe.create({ authorHandle: 'proof', sourceLocalId: 'r1', slug: 'rye', title: 'Rye' });
  await mongoose.connection.collection('recipes').insertOne({ _id: new mongoose.Types.ObjectId(), title: 'Rye', instructions: [] });
  await User.create({ email: 'victor@example.com', handle: 'victor', passwordHash: 'x' });
});

describe('claiming the seeded library', () => {
  it('reports what it would claim, and changes nothing on a dry run', async () => {
    const r = await claimLibrary({ email: 'Victor@example.com' });
    expect(r).toEqual({ handle: 'proof', published: 1, library: 1 });
    expect((await User.findOne({})).handle).toBe('victor');
  });

  it('gives the account the reserved handle, the seeded copies, and the library', async () => {
    await claimLibrary({ email: 'victor@example.com', dryRun: false });
    const user = await User.findOne({});
    expect(user.handle).toBe('proof');
    expect((await PublishedRecipe.findOne({ slug: 'rye' })).authorId).toBe(user._id);
    expect((await mongoose.connection.collection('recipes').findOne({})).ownerId).toBe(user._id);
  });

  it('refuses an email with no account, naming the fix', async () => {
    await expect(claimLibrary({ email: 'nobody@example.com' })).rejects.toThrow(/Sign up in the app first/);
  });

  it('will not take a handle another account holds', async () => {
    await User.create({ email: 'someone@example.com', handle: 'proof', passwordHash: 'x' });
    await expect(claimLibrary({ email: 'victor@example.com', dryRun: false })).rejects.toThrow(/already belongs/);
  });
});
