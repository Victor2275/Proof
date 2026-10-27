import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { SyncRecord } from '../models/SyncRecord.js';
import { SyncPhoto } from '../models/SyncPhoto.js';
import { changesSince } from '../services/sync.js';
import { signedIn } from './signIn.js';

let mongoServer;

beforeAll(async () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([User, Session, SyncRecord, SyncPhoto].map((M) => M.deleteMany({})));
});

const rye = (over = {}) => ({
  _id: 'r1', title: 'Rye', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', deletedAt: null, ...over,
});

const sync = (auth, body) => request(app).post('/api/sync').set(auth).send(body);

/** Pulls every page, as a device does. */
async function pullAll(auth, since = null) {
  const changes = [];
  let cursor = since;
  for (;;) {
    const { body } = await sync(auth, { since: cursor });
    changes.push(...body.changes);
    cursor = body.cursor;
    if (!body.more) return { changes, cursor, photos: body.photos };
  }
}

describe('who may sync', () => {
  it('is a confirmed Pro account; anyone else is told it is part of Pro', async () => {
    const free = await signedIn('free');
    const unconfirmed = await signedIn('new', { plan: 'pro', verified: false });
    const lapsed = await signedIn('gone', { plan: 'pro' });
    await User.updateOne({ _id: lapsed.user._id }, { planExpiresAt: new Date('2020-01-01') });
    for (const who of [free, unconfirmed, lapsed]) {
      const res = await sync(who.auth, { since: null });
      expect(res.statusCode).toBe(403);
      expect(res.body.plan).toBe(true);
    }
    expect((await request(app).post('/api/sync').send({ since: null })).statusCode).toBe(401);
    const pro = await signedIn('pro', { plan: 'pro' });
    expect((await sync(pro.auth, { since: null })).statusCode).toBe(200);
  });
});

describe('pushing and pulling', () => {
  it('carries a record from one device to another, deletions included', async () => {
    const { auth } = await signedIn('ada', { plan: 'pro' });
    await sync(auth, { changes: [{ store: 'recipes', record: rye() }, { store: 'bakeLogs', record: { ...rye({ _id: 'b1' }), recipeId: 'r1' } }] });

    const first = await pullAll(auth);
    expect(first.changes.map((c) => [c.store, c.record._id])).toEqual(expect.arrayContaining([['recipes', 'r1'], ['bakeLogs', 'b1']]));

    await sync(auth, { changes: [{ store: 'recipes', record: rye({ updatedAt: '2026-10-02T10:00:00.000Z', deletedAt: '2026-10-02T10:00:00.000Z' }) }] });
    const later = await pullAll(auth, first.cursor);
    expect(later.changes.find((c) => c.record._id === 'r1').record.deletedAt).toBe('2026-10-02T10:00:00.000Z');
  });

  it('keeps the newer write, and hands the older device the newer copy', async () => {
    const { auth } = await signedIn('ada', { plan: 'pro' });
    await sync(auth, { changes: [{ store: 'recipes', record: rye({ title: 'Rye, hotter', updatedAt: '2026-10-05T10:00:00.000Z' }) }] });

    const stale = await sync(auth, { changes: [{ store: 'recipes', record: rye({ title: 'Rye, old idea' }) }] });
    expect(stale.body.accepted).toBe(0);
    expect(stale.body.newer).toEqual([{ store: 'recipes', record: expect.objectContaining({ title: 'Rye, hotter' }) }]);
    expect((await SyncRecord.findOne()).data.title).toBe('Rye, hotter');
  });

  it("keeps each account's cookbook to itself", async () => {
    const ada = await signedIn('ada', { plan: 'pro' });
    const bea = await signedIn('bea', { plan: 'pro' });
    await sync(ada.auth, { changes: [{ store: 'recipes', record: rye() }] });
    await sync(bea.auth, { changes: [{ store: 'recipes', record: rye({ title: "Bea's rye" }) }] });

    expect((await pullAll(ada.auth)).changes.map((c) => c.record.title)).toEqual(['Rye']);
    expect((await pullAll(bea.auth)).changes.map((c) => c.record.title)).toEqual(["Bea's rye"]);
  });

  it('skips what is not a record of a synced store', async () => {
    const { auth } = await signedIn('ada', { plan: 'pro' });
    const res = await sync(auth, {
      changes: [
        { store: 'recipes', record: rye() },
        { store: 'users', record: rye({ _id: 'x' }) },
        { store: 'recipes', record: { _id: 'no-date' } },
        { store: 'recipes', record: rye({ _id: '../../etc' }) },
      ],
    });
    expect(res.body).toMatchObject({ accepted: 1, skipped: 3 });
    expect((await request(app).post('/api/sync').set(auth).send({ changes: Array(501).fill({}) })).statusCode).toBe(400);
  });
});

describe('the cursor', () => {
  it('pages through a push that landed in one millisecond without skipping or repeating a record', async () => {
    const { user, auth } = await signedIn('ada', { plan: 'pro' });
    await sync(auth, { changes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ store: 'notes', record: rye({ _id: id }) })) });

    const seen = [];
    let cursor = null;
    for (;;) {
      const page = await changesSince(user._id, cursor, new Date(), 2);
      seen.push(...page.changes.map((c) => c.record._id));
      cursor = page.cursor;
      if (!page.more) break;
    }
    expect(seen).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('reads the last few seconds again rather than miss a write still landing', async () => {
    const { user, auth } = await signedIn('ada', { plan: 'pro' });
    await sync(auth, { changes: [{ store: 'notes', record: rye() }] });
    const { cursor } = await changesSince(user._id, null);
    expect((await changesSince(user._id, cursor)).changes).toHaveLength(1);
    const muchLater = new Date(Date.now() + 60_000);
    const settled = (await changesSince(user._id, cursor, muchLater)).cursor;
    expect((await changesSince(user._id, settled, muchLater)).changes).toHaveLength(0);
  });
});

describe('photographs', () => {
  it('says plainly when the server cannot store them yet', async () => {
    const { auth } = await signedIn('ada', { plan: 'pro' });
    const res = await request(app).post('/api/sync/photos').set(auth).send({ id: 'p1', data: 'data:image/webp;base64,AAAA' });
    expect(res.statusCode).toBe(503);
    expect(res.body.degraded).toBe(true);
  });

  it('answers an uploaded one with its address, and lists it in a pull', async () => {
    const { user, auth } = await signedIn('ada', { plan: 'pro' });
    await SyncPhoto.create({ _id: `${user._id}:p1`, userId: user._id, photoId: 'p1', url: 'https://res.cloudinary.com/x/p1.webp', createdAt: new Date() });
    const res = await request(app).post('/api/sync/photos').set(auth).send({ id: 'p1', data: 'data:image/webp;base64,AAAA' });
    expect(res.body.url).toBe('https://res.cloudinary.com/x/p1.webp');
    expect((await pullAll(auth)).photos).toEqual({ p1: 'https://res.cloudinary.com/x/p1.webp' });
  });

  it('refuses what is not a photograph', async () => {
    const { auth } = await signedIn('ada', { plan: 'pro' });
    expect((await request(app).post('/api/sync/photos').set(auth).send({ id: 'p1', data: 'data:text/html;base64,AAAA' })).statusCode).toBe(400);
    expect((await request(app).post('/api/sync/photos').set(auth).send({ id: '../x', data: 'data:image/webp;base64,AAAA' })).statusCode).toBe(400);
  });
});

describe('the account', () => {
  it('exports the synced cookbook, and deleting the account removes it', async () => {
    const { user, token, auth } = await signedIn('ada', { plan: 'pro' });
    await User.updateOne({ _id: user._id }, { passwordHash: (await import('@node-rs/argon2')).hashSync('a long password!') });
    await sync(auth, { changes: [{ store: 'recipes', record: rye() }] });

    const exported = await request(app).get('/api/auth/export').set(auth);
    expect(exported.body.cookbook.recipes.map((r) => r.title)).toEqual(['Rye']);

    await request(app).delete('/api/auth/me').set({ Authorization: `Bearer ${token}` }).send({ password: 'a long password!' });
    expect(await SyncRecord.countDocuments()).toBe(0);
  });
});
