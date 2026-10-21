import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as connect } from 'socket.io-client';
import { app, server, loadTimersFromDb } from '../index.js';
import { Timer } from '../models/Timer.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { createSession } from '../middleware/auth.js';
import { cleanTimer } from '../routes/timers.js';

/*
 * Timers sync between one account's devices, and only that account's. They
 * survive a server restart, because a six-hour bulk ferment outlives a deploy.
 */

let mongoServer;
let url;

beforeAll(async () => {
  delete process.env.ADMIN_PIN;
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  await mongoose.connect(mongoServer.getUri());
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([Timer.deleteMany({}), User.deleteMany({}), Session.deleteMany({})]);
  await loadTimersFromDb();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const sessionFor = async (userId) => {
  if (!(await User.exists({ _id: userId }))) {
    await User.create({ _id: userId, email: `${userId}@example.com`, handle: userId, passwordHash: 'x' });
  }
  return createSession({ kind: 'user', userId });
};

/** Resolves with the next timers:sync a socket receives. */
const nextSync = (socket) => new Promise((resolve) => socket.once('timers:sync', resolve));

describe('timers over REST', () => {
  it('belong to an account: no session, no timers', async () => {
    expect((await request(app).get('/api/timers')).statusCode).toBe(401);
  });

  it("resume after a restart, each in its own account's list", async () => {
    const endTime = Date.now() + 3600 * 1000;
    await Timer.create({ ownerId: 'u1', id: 'bulk-1', name: 'Bulk Fermentation', endTime, remainingMs: 0, hasRung: false });
    await Timer.create({ ownerId: 'u2', id: 'proof-1', name: 'Proof', endTime: null, remainingMs: 900000, hasRung: false });
    await loadTimersFromDb(); // stands in for the server coming back up

    const mine = await request(app).get('/api/timers').set(auth(await sessionFor('u1')));
    expect(mine.body).toEqual([{ id: 'bulk-1', name: 'Bulk Fermentation', endTime, remainingMs: 0, hasRung: false }]);
    const theirs = await request(app).get('/api/timers').set(auth(await sessionFor('u2')));
    expect(theirs.body[0]).toMatchObject({ id: 'proof-1', endTime: null, remainingMs: 900000 });
  });

  it('discards finished timers, and the shared list from before accounts', async () => {
    await Timer.collection.insertMany([
      { ownerId: 'u1', id: 'done-1', name: 'Bake', endTime: Date.now() - 60_000, remainingMs: 0, hasRung: true },
      { id: 'legacy-1', name: 'Shared by everyone', endTime: Date.now() + 60_000, remainingMs: 0, hasRung: false },
    ]);
    await loadTimersFromDb();
    expect(await Timer.countDocuments({})).toBe(0);
  });

  it("DELETE removes the caller's timer, and 404s for anyone else's", async () => {
    await Timer.create({ ownerId: 'u1', id: 'bulk-2', name: 'Autolyse', endTime: Date.now() + 60_000, remainingMs: 0, hasRung: false });
    await loadTimersFromDb();

    expect((await request(app).delete('/api/timers/bulk-2').set(auth(await sessionFor('u2')))).statusCode).toBe(404);
    const del = await request(app).delete('/api/timers/bulk-2').set(auth(await sessionFor('u1')));
    expect(del.body).toEqual({ success: true, timers: [] });
    expect(await Timer.countDocuments({})).toBe(0);
  });
});

describe('timers over the socket', () => {
  it('refuses a socket with no signed-in session', async () => {
    const socket = connect(url, { transports: ['websocket'], reconnection: false });
    const err = await new Promise((resolve) => socket.once('connect_error', resolve));
    expect(err.message).toMatch(/Sign in/);
    socket.close();
  });

  it("reaches the same account's other devices, and nobody else's", async () => {
    const a1 = await sessionFor('ada');
    const a2 = await sessionFor('ada');
    const b = await sessionFor('bea');
    const kitchen = connect(url, { transports: ['websocket'], auth: { token: a1 } });
    const phone = connect(url, { transports: ['websocket'], auth: { token: a2 } });
    const stranger = connect(url, { transports: ['websocket'], auth: { token: b } });
    await Promise.all([nextSync(kitchen), nextSync(phone), nextSync(stranger)]);

    let strangerSaw = null;
    stranger.on('timers:sync', (t) => { strangerSaw = t; });
    const onPhone = nextSync(phone);
    kitchen.emit('timer:add', { id: 'bulk', name: 'Bulk', endTime: Date.now() + 60_000, remainingMs: 60_000, hasRung: false });

    expect((await onPhone).map((t) => t.id)).toEqual(['bulk']);
    await new Promise((r) => setTimeout(r, 100));
    expect(strangerSaw).toBeNull();
    expect(await Timer.countDocuments({ ownerId: 'ada' })).toBe(1);

    // A timer started offline joins the account's list when the device connects.
    const merged = nextSync(phone);
    phone.emit('timers:merge', [{ id: 'offline', name: 'Rest', endTime: null, remainingMs: 5000, hasRung: false }]);
    expect((await merged).map((t) => t.id).sort()).toEqual(['bulk', 'offline']);

    kitchen.close();
    phone.close();
    stranger.close();
  });

  it('ignores malformed input', () => {
    expect(cleanTimer({ id: 'x y', remainingMs: 1, endTime: null })).toBeNull();
    expect(cleanTimer({ id: 'ok', remainingMs: 'lots', endTime: null })).toBeNull();
    expect(cleanTimer({ id: 'ok', remainingMs: 1, endTime: null, name: 'n'.repeat(500) }).name).toHaveLength(80);
  });
});
