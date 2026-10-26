import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { Recipe } from '../models/Recipe.js';
import { BakeLog } from '../models/BakeLog.js';
import { Note } from '../models/Note.js';
import { Pantry } from '../models/Pantry.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { signedIn } from './signIn.js';

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
  await Promise.all([Recipe, BakeLog, Note, Pantry, User, Session].map((M) => M.deleteMany({})));
});

describe('AI endpoints', () => {
  // A Pro account reaches the routes themselves; the checks here are theirs.
  let pro;
  beforeEach(async () => {
    pro = (await signedIn('pro', { plan: 'pro' })).auth;
  });

  it('POST /api/extract - refuses to fetch an address only the server can reach', async () => {
    for (const url of ['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'ftp://example.com', 'http://example.com:27017']) {
      const res = await request(app).post('/api/extract').set(pro).send({ url });
      expect(res.statusCode, url).toBe(400);
    }
  });

  // Two calls only: the AI routes share a burst limit of ten a minute.
  it('POST /api/ai-photo - takes only a photograph, and not a huge one', async () => {
    expect((await request(app).post('/api/ai-photo').set(pro).send({ image: 'data:text/html;base64,PGgxPg==' })).statusCode).toBe(400);
    const huge = `data:image/jpeg;base64,${'A'.repeat(5_700_000)}`;
    expect((await request(app).post('/api/ai-photo').set(pro).send({ image: huge })).statusCode).toBe(413);
  });

  it('POST /api/ai-substitutions - requires an ingredient', async () => {
    const res = await request(app).post('/api/ai-substitutions').set(pro).send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/ai-restructure - refuses text too long to be worth the tokens', async () => {
    const res = await request(app).post('/api/ai-restructure').set(pro).send({ rawText: 'x'.repeat(20_001) });
    expect(res.statusCode).toBe(413);
  });

  it('need an account: each call costs money', async () => {
    const res = await request(app).post('/api/ai-substitutions').send({ ingredientName: 'Buttermilk' });
    expect(res.statusCode).toBe(401);
  });
});

describe('the retired operator PIN', () => {
  it('opens nothing: the route is gone, and an ADMIN_PIN in the environment is ignored', async () => {
    process.env.ADMIN_PIN = '1234';
    expect((await request(app).post('/api/auth/pin').send({ pin: '1234' })).statusCode).toBe(404);
    expect((await request(app).get('/api/library')).statusCode).toBe(401);
    delete process.env.ADMIN_PIN;
  });
});

describe('the pre-Phase-1 library', () => {
  it('GET /api/library returns the four collections, without tombstones', async () => {
    const recipe = await Recipe.create({ title: 'Rye', instructions: ['Bake.'] });
    await Recipe.create({ title: 'Gone', instructions: [], deletedAt: new Date() });
    await BakeLog.create({ recipeId: recipe._id, notes: 'Dense' });
    await Note.create({ title: 'Oven', content: 'Runs cold' });
    await Pantry.create({ name: 'Flour' });

    const { auth } = await signedIn('owner', { role: 'owner', plan: 'pro' });
    const res = await request(app).get('/api/library').set(auth);
    expect(res.statusCode).toBe(200);
    expect(res.body.recipes.map((r) => r.title)).toEqual(['Rye']);
    expect(res.body.bakeLogs[0].recipeId).toBe(recipe._id);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.pantry).toHaveLength(1);
  });

  it('is private to the owner: a moderator is refused with 403, nobody with 401', async () => {
    const mod = await signedIn('mod', { role: 'moderator' });
    expect((await request(app).get('/api/library').set(mod.auth)).statusCode).toBe(403);
    expect((await request(app).get('/api/library')).statusCode).toBe(401);
  });

  it('can no longer be written to, by anyone', async () => {
    for (const path of ['/api/recipes', '/api/bakelogs', '/api/notes', '/api/pantry']) {
      const res = await request(app).post(path).send({ title: 'x', name: 'x' });
      expect(res.statusCode).toBe(404);
    }
    expect(await Recipe.countDocuments()).toBe(0);
  });

  it('mints string ids for new server records, the same shape the device mints', async () => {
    const recipe = await Recipe.create({ title: 'Rye', instructions: [] });
    expect(recipe._id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(recipe.deletedAt).toBeNull();
    expect(recipe.ownerId).toBeNull();
  });
});
