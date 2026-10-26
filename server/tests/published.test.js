import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// The model is not asked in tests: each test says what the screen decides.
const screen = vi.hoisted(() => ({ recipe: { verdict: 'approve', reason: '' }, comment: { verdict: 'approve', reason: '' } }));
vi.mock('../services/moderation.js', () => ({
  screenRecipe: vi.fn(async () => screen.recipe),
  screenComment: vi.fn(async () => screen.comment),
}));

const { app } = await import('../index.js');
const { User } = await import('../models/User.js');
const { Session } = await import('../models/Session.js');
const { PublishedRecipe } = await import('../models/PublishedRecipe.js');
const { Rating } = await import('../models/Rating.js');
const { Comment } = await import('../models/Comment.js');
const { Report } = await import('../models/Report.js');
const { createSession } = await import('../middleware/auth.js');

let mongoServer;

beforeAll(async () => {
  delete process.env.ADMIN_PIN;
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  screen.recipe = { verdict: 'approve', reason: '' };
  screen.comment = { verdict: 'approve', reason: '' };
  await Promise.all([User, Session, PublishedRecipe, Rating, Comment, Report].map((M) => M.deleteMany({})));
});

afterEach(() => {
  delete process.env.ADMIN_PIN;
});

const DAY = 24 * 60 * 60 * 1000;

async function account(handle, { verified = true, ageMs = 2 * DAY } = {}) {
  const created = new Date(Date.now() - ageMs);
  const user = await User.create({
    email: `${handle}@example.com`, handle, passwordHash: 'x',
    emailVerifiedAt: verified ? created : null, createdAt: created,
  });
  return { user, token: await createSession({ kind: 'user', userId: user._id }) };
}

const as = (token) => ({ Authorization: `Bearer ${token}` });

const RYE = {
  sourceLocalId: '01J9ZRYE00000000000000000A',
  sourceUpdatedAt: '2026-10-01T10:00:00.000Z',
  title: 'Dark Rye',
  description: 'A dense loaf.',
  servings: 1,
  prepTime: '30',
  cookTime: '60',
  tags: ['bread', 'Favorite'],
  ingredients: [{ name: 'Rye flour', quantity: 500, unit: 'g' }],
  instructions: ['Mix.', 'Bake.'],
  photos: [],
};

const publish = (token, body = RYE) => request(app).post('/api/published').set(as(token)).send(body);

describe('publishing', () => {
  it('needs an account with a confirmed email', async () => {
    expect((await request(app).post('/api/published').send(RYE)).statusCode).toBe(401);
    const { token } = await account('newbie', { verified: false });
    const res = await publish(token);
    expect(res.statusCode).toBe(403);
    expect(res.body.unverified).toBe(true);
  });

  it('takes a snapshot that goes live when the screen passes it, without private tags', async () => {
    const { token } = await account('ada');
    const res = await publish(token);
    expect(res.statusCode).toBe(200);
    expect(res.body.recipe).toMatchObject({ slug: 'dark-rye', authorHandle: 'ada', moderation: { state: 'approved' } });
    expect(res.body.recipe.tags).toEqual(['bread']);

    const page = await request(app).get('/api/published/dark-rye');
    expect(page.body.title).toBe('Dark Rye');
    // A stranger never sees the author's account id, device id or moderation notes.
    expect(page.body).not.toHaveProperty('authorId');
    expect(page.body).not.toHaveProperty('sourceLocalId');
    expect(page.body).not.toHaveProperty('moderation');
  });

  it("holds what the screen doesn't pass, showing the author why and nobody else anything", async () => {
    screen.recipe = { verdict: 'hold', reason: 'Reads like a copy of a magazine recipe.' };
    const { token } = await account('ada');
    await publish(token);

    expect((await request(app).get('/api/published/dark-rye')).statusCode).toBe(404);
    const mine = await request(app).get('/api/published/mine').set(as(token));
    expect(mine.body.items[0].moderation).toEqual({ state: 'pending', reason: 'Reads like a copy of a magazine recipe.' });
  });

  it('refuses a recipe without its ingredients or method, naming why', async () => {
    const { token } = await account('ada');
    expect((await publish(token, { ...RYE, title: '' })).body.field).toBe('title');
    expect((await publish(token, { ...RYE, instructions: [] })).body.field).toBe('body');
  });

  it('asks an imported recipe for a credit, or the author\'s word that the prose is theirs', async () => {
    const { token } = await account('ada');
    const imported = { ...RYE, sourceUrl: 'https://someblog.example/rye' };
    const refused = await publish(token, imported);
    expect(refused.statusCode).toBe(400);
    expect(refused.body.field).toBe('sourceAttribution');

    expect((await publish(token, { ...imported, sourceAttribution: 'Some Blog' })).statusCode).toBe(200);
    expect((await publish(token, { ...imported, sourceLocalId: 'other', ownWords: true })).statusCode).toBe(200);
  });

  it('pushes an update to the same address, even under a new title', async () => {
    const { token } = await account('ada');
    const first = await publish(token);
    const again = await publish(token, { ...RYE, title: 'Darker Rye', sourceUpdatedAt: '2026-10-05T10:00:00.000Z' });
    expect(again.body.recipe._id).toBe(first.body.recipe._id);
    expect(again.body.recipe.slug).toBe('dark-rye');
    expect(again.body.recipe.title).toBe('Darker Rye');
    expect(again.body.recipe.sourceUpdatedAt).toBe('2026-10-05T10:00:00.000Z');
    expect(await PublishedRecipe.countDocuments()).toBe(1);
  });

  it('gives a second recipe of the same name its own address', async () => {
    const ada = await account('ada');
    const bea = await account('bea');
    await publish(ada.token);
    const res = await publish(bea.token);
    expect(res.body.recipe.slug).toBe('dark-rye-2');
  });

  it("publishes the author's own photographs only, and says how many stayed behind", async () => {
    const { token } = await account('ada');
    const res = await publish(token, {
      ...RYE,
      photos: [
        'https://res.cloudinary.com/demo/image/upload/rye.jpg',
        'https://someblog.example/their-photo.jpg',
        'data:image/webp;base64,UklGRg==',
      ],
    });
    // Cloudinary isn't configured in tests, so the device photo can't be uploaded either.
    expect(res.body.recipe.imageUrls).toEqual(['https://res.cloudinary.com/demo/image/upload/rye.jpg']);
    expect(res.body.droppedPhotos).toBe(2);
  });

  it("is unpublished by its author and nobody else", async () => {
    const ada = await account('ada');
    const bea = await account('bea');
    const { body } = await publish(ada.token);
    expect((await request(app).delete(`/api/published/${body.recipe._id}`).set(as(bea.token))).statusCode).toBe(404);
    expect((await request(app).delete(`/api/published/${body.recipe._id}`).set(as(ada.token))).statusCode).toBe(200);
    expect((await request(app).get('/api/published/dark-rye')).statusCode).toBe(404);
  });

  it('counts saves into other cookbooks', async () => {
    const { token } = await account('ada');
    const { body } = await publish(token);
    await request(app).post(`/api/published/${body.recipe._id}/save`);
    await request(app).post(`/api/published/${body.recipe._id}/save`);
    expect((await request(app).get('/api/published/dark-rye')).body.stats.saves).toBe(2);
  });
});

describe('browsing', () => {
  it('sorts by most baked and by recent, and filters by author and tag', async () => {
    const ada = await account('ada');
    await PublishedRecipe.create([
      { authorHandle: 'ada', authorId: ada.user._id, sourceLocalId: 'a', slug: 'a', title: 'Alpha', tags: ['bread'], stats: { bakedCount: 1 }, publishedAt: new Date('2026-01-01'), moderation: { state: 'approved' } },
      { authorHandle: 'bea', sourceLocalId: 'b', slug: 'b', title: 'Beta', tags: ['cake'], stats: { bakedCount: 9 }, publishedAt: new Date('2026-02-01'), moderation: { state: 'approved' } },
      { authorHandle: 'bea', sourceLocalId: 'c', slug: 'c', title: 'Held', moderation: { state: 'pending' } },
    ]);
    const titles = async (q) => (await request(app).get(`/api/published?${q}`)).body.items.map((r) => r.title);
    expect(await titles('sort=baked')).toEqual(['Beta', 'Alpha']);
    expect(await titles('sort=recent')).toEqual(['Beta', 'Alpha']);
    expect(await titles('author=ADA')).toEqual(['Alpha']);
    expect(await titles('tag=cake')).toEqual(['Beta']);
    const index = await request(app).get('/api/published/index');
    expect(index.body.items.map((r) => r.title)).toEqual(['Alpha', 'Beta']);
  });
});

describe('ratings and "I baked this"', () => {
  it('counts each account once, and never the author', async () => {
    const ada = await account('ada');
    const bea = await account('bea');
    const cy = await account('cy');
    const { body } = await publish(ada.token);
    const id = body.recipe._id;

    expect((await request(app).put(`/api/published/${id}/rating`).set(as(ada.token)).send({ stars: 5 })).statusCode).toBe(403);
    await request(app).put(`/api/published/${id}/rating`).set(as(bea.token)).send({ stars: 4, baked: true });
    await request(app).put(`/api/published/${id}/rating`).set(as(bea.token)).send({ stars: 2 }); // replaces
    const res = await request(app).put(`/api/published/${id}/rating`).set(as(cy.token)).send({ baked: true });

    expect(res.body.stats).toMatchObject({ ratingSum: 2, ratingCount: 1, bakedCount: 2 });
    const mine = await request(app).get(`/api/published/${id}/rating`).set(as(bea.token));
    expect(mine.body).toEqual({ stars: 2, baked: true });
  });

  it('refuses a rating outside one to five', async () => {
    const ada = await account('ada');
    const bea = await account('bea');
    const { body } = await publish(ada.token);
    expect((await request(app).put(`/api/published/${body.recipe._id}/rating`).set(as(bea.token)).send({ stars: 9 })).statusCode).toBe(400);
  });

  it('takes a deleted account\'s rating off the counts', async () => {
    const ada = await account('ada');
    const bea = await account('bea');
    const { body } = await publish(ada.token);
    await request(app).put(`/api/published/${body.recipe._id}/rating`).set(as(bea.token)).send({ stars: 5, baked: true });
    await bea.user.updateOne({ passwordHash: (await import('@node-rs/argon2')).hashSync('a long password!') });
    await request(app).delete('/api/auth/me').set(as(bea.token)).send({ password: 'a long password!' });
    expect((await request(app).get('/api/published/dark-rye')).body.stats).toMatchObject({ ratingCount: 0, bakedCount: 0 });
  });
});

describe('comments', () => {
  let recipeId;
  let ada;
  beforeEach(async () => {
    ada = await account('ada');
    recipeId = (await publish(ada.token)).body.recipe._id;
  });

  const post = (token, body) => request(app).post(`/api/published/${recipeId}/comments`).set(as(token)).send({ body });

  it('need a confirmed email and an account a day old', async () => {
    const unverified = await account('nov', { verified: false });
    expect((await post(unverified.token, 'Hi')).statusCode).toBe(403);
    const fresh = await account('fresh', { ageMs: 60_000 });
    const res = await post(fresh.token, 'Hi');
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/first day/);
  });

  it('are shown once the screen passes them', async () => {
    const bea = await account('bea');
    expect((await post(bea.token, 'Lovely crumb.')).statusCode).toBe(201);
    const list = await request(app).get(`/api/published/${recipeId}/comments`);
    expect(list.body.items.map((c) => c.body)).toEqual(['Lovely crumb.']);
  });

  it('when held, are visible to their author only', async () => {
    screen.comment = { verdict: 'hold', reason: 'Looks like an advert.' };
    const bea = await account('bea');
    await post(bea.token, 'Buy my flour at example.com');
    expect((await request(app).get(`/api/published/${recipeId}/comments`)).body.items).toEqual([]);
    const own = await request(app).get(`/api/published/${recipeId}/comments`).set(as(bea.token));
    expect(own.body.items[0]).toMatchObject({ pending: true, mine: true });
  });

  it("can be taken down by their author or the recipe's, and nobody else", async () => {
    const bea = await account('bea');
    const cy = await account('cy');
    const { body } = await post(bea.token, 'Hm.');
    const id = body.comment._id;
    expect((await request(app).delete(`/api/published/comments/${id}`).set(as(cy.token))).statusCode).toBe(403);
    expect((await request(app).delete(`/api/published/comments/${id}`).set(as(ada.token))).statusCode).toBe(200);
    expect((await request(app).get(`/api/published/${recipeId}/comments`)).body.items).toEqual([]);
  });

  it('refuse an empty or overlong body', async () => {
    const bea = await account('bea');
    expect((await post(bea.token, '   ')).statusCode).toBe(400);
    expect((await post(bea.token, 'x'.repeat(1001))).statusCode).toBe(400);
  });
});

describe('reports and the moderation queue', () => {
  it('lets anyone report, and the operator act on it', async () => {
    process.env.ADMIN_PIN = '1234';
    const ada = await account('ada');
    const { body } = await publish(ada.token);
    const id = body.recipe._id;

    expect((await request(app).post('/api/reports').send({ targetType: 'recipe', targetId: id })).statusCode).toBe(400);
    expect((await request(app).post('/api/reports').send({ targetType: 'recipe', targetId: id, reason: 'Spam' })).statusCode).toBe(201);

    expect((await request(app).get('/api/moderation/queue').set(as(ada.token))).statusCode).toBe(403);
    const op = await createSession({ kind: 'operator' });
    const queue = await request(app).get('/api/moderation/queue').set(as(op));
    expect(queue.body.reports[0]).toMatchObject({ reason: 'Spam', target: { title: 'Dark Rye' } });

    await request(app).post(`/api/moderation/recipes/${id}`).set(as(op)).send({ action: 'takedown', reason: 'Spam.' });
    await request(app).post(`/api/moderation/reports/${queue.body.reports[0]._id}`).set(as(op)).send({ resolution: 'Taken down' });
    expect((await request(app).get('/api/published/dark-rye')).statusCode).toBe(404);
    const mine = await request(app).get('/api/published/mine').set(as(ada.token));
    expect(mine.body.items[0].moderation).toEqual({ state: 'rejected', reason: 'Spam.' });
    expect((await request(app).get('/api/moderation/queue').set(as(op))).body.reports).toEqual([]);
  });

  it('approves a held recipe into the cookbook, and a held comment into the conversation', async () => {
    screen.recipe = { verdict: 'hold', reason: 'Unsure.' };
    screen.comment = { verdict: 'hold', reason: 'Unsure.' };
    const ada = await account('ada');
    const bea = await account('bea');
    const { body } = await publish(ada.token);
    const op = await createSession({ kind: 'operator' });

    expect((await request(app).get('/api/moderation/queue').set(as(op))).body.recipes).toHaveLength(1);
    await request(app).post(`/api/moderation/recipes/${body.recipe._id}`).set(as(op)).send({ action: 'approve' });

    // Only a live recipe takes comments; this one is held in its turn.
    await request(app).post(`/api/published/${body.recipe._id}/comments`).set(as(bea.token)).send({ body: 'Nice' });
    const queue = await request(app).get('/api/moderation/queue').set(as(op));
    expect(queue.body.comments).toHaveLength(1);
    await request(app).post(`/api/moderation/comments/${queue.body.comments[0]._id}`).set(as(op)).send({ action: 'approve' });

    expect((await request(app).get('/api/published/dark-rye')).statusCode).toBe(200);
    expect((await request(app).get(`/api/published/${body.recipe._id}/comments`)).body.items).toHaveLength(1);
  });

  it('keeps a rejection\'s reason, and a fixed resubmission is screened again', async () => {
    const ada = await account('ada');
    const { body } = await publish(ada.token);
    const op = await createSession({ kind: 'operator' });
    await request(app).post(`/api/moderation/recipes/${body.recipe._id}`).set(as(op)).send({ action: 'reject', reason: 'Credit the source.' });
    expect((await request(app).get('/api/published/dark-rye')).statusCode).toBe(404);

    const again = await publish(ada.token, { ...RYE, sourceAttribution: 'Grandma' });
    expect(again.body.recipe.moderation.state).toBe('approved');
  });
});

describe('profiles', () => {
  it("shows a baker's live recipes and how often they have been baked", async () => {
    const ada = await account('ada');
    await ada.user.updateOne({ bio: 'Rye, mostly.' });
    await publish(ada.token);
    await PublishedRecipe.updateOne({}, { $set: { 'stats.bakedCount': 3 } });

    const res = await request(app).get('/api/profiles/@Ada');
    expect(res.body.profile).toMatchObject({ handle: 'ada', bio: 'Rye, mostly.' });
    expect(res.body.profile).not.toHaveProperty('email');
    expect(res.body.recipes.map((r) => r.title)).toEqual(['Dark Rye']);
    expect(res.body.stats).toEqual({ published: 1, baked: 3 });
  });

  it('shows the seeded library under its handle before anyone claims it, and 404s for nobody', async () => {
    await PublishedRecipe.create({ authorHandle: 'proof', sourceLocalId: 's', slug: 's', title: 'Seeded', moderation: { state: 'approved' } });
    expect((await request(app).get('/api/profiles/proof')).body.stats.published).toBe(1);
    expect((await request(app).get('/api/profiles/nobody')).statusCode).toBe(404);
  });
});

const built = fs.existsSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../dist/index.html'));

describe.skipIf(!built)('shared links', () => {
  it('serve a shared recipe with its own title, preview tags and structured data', async () => {
    const { token } = await account('ada');
    await publish(token);
    const res = await request(app).get('/r/dark-rye');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.text).toContain('<title>Dark Rye · Proof</title>');
    expect(res.text).toContain('property="og:title" content="Dark Rye"');
    expect(res.text).toContain('"@type":"Recipe"');
  });

  it("serve a baker's page with their name, and an unknown slug as the plain app", async () => {
    await account('ada');
    await PublishedRecipe.create({ authorHandle: 'ada', sourceLocalId: 'x', slug: 'x', title: 'X', moderation: { state: 'approved' } });
    expect((await request(app).get('/@ada')).text).toContain('<title>@ada · Proof</title>');
    expect((await request(app).get('/r/nothing-here')).text).toContain('<title>Proof</title>');
  });
});
