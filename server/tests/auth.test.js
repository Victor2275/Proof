import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { createSession, readSession } from '../middleware/auth.js';

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
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), PublishedRecipe.deleteMany({})]);
});

const ADA = { email: 'Ada@Example.com', password: 'correct horse battery', handle: 'Ada_Bakes', displayName: 'Ada' };
const signup = (body = ADA) => request(app).post('/api/auth/signup').send(body);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('signing up', () => {
  it('creates an account and a session, and never returns the password hash', async () => {
    const res = await signup();
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', handle: 'ada_bakes', emailVerified: false, plan: 'free' });
    expect(JSON.stringify(res.body)).not.toMatch(/argon2|passwordHash/);

    const stored = await User.findOne({ email: 'ada@example.com' });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('names what is wrong with each field', async () => {
    expect((await signup({ ...ADA, email: 'not-an-email' })).body.field).toBe('email');
    expect((await signup({ ...ADA, password: 'short' })).body.field).toBe('password');
    expect((await signup({ ...ADA, handle: 'a' })).body.field).toBe('handle');
    expect((await signup({ ...ADA, handle: 'has space' })).body.field).toBe('handle');
  });

  it('keeps reserved handles, including the one the seeded library is published under', async () => {
    const res = await signup({ ...ADA, handle: 'proof' });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/reserved/);
  });

  it('refuses a second account for the same email or handle, whatever the case', async () => {
    await signup();
    expect((await signup({ ...ADA, handle: 'someone_else', email: 'ADA@example.com' })).statusCode).toBe(409);
    const taken = await signup({ ...ADA, email: 'other@example.com', handle: 'ADA_BAKES' });
    expect(taken.statusCode).toBe(409);
    expect(taken.body.field).toBe('handle');
  });
});

describe('signing in and out', () => {
  beforeEach(async () => {
    await signup();
  });

  it('signs in with the right password, in any email case', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ADA@example.com', password: ADA.password });
    expect(res.statusCode).toBe(200);
    const me = await request(app).get('/api/auth/me').set(auth(res.body.token));
    expect(me.body.handle).toBe('ada_bakes');
  });

  it('gives one answer for a wrong password and for no account, so it cannot be used to find accounts', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ email: ADA.email, password: 'wrong password!' });
    const nobody = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever12345' });
    expect(wrong.statusCode).toBe(401);
    expect(nobody.statusCode).toBe(401);
    expect(wrong.body.error).toBe(nobody.body.error);
  });

  it('ends the session on sign-out', async () => {
    const { body } = await request(app).post('/api/auth/login').send({ email: ADA.email, password: ADA.password });
    await request(app).post('/api/auth/logout').set(auth(body.token));
    const me = await request(app).get('/api/auth/me').set(auth(body.token));
    expect(me.statusCode).toBe(401);
    expect(me.body.account).toBe(true);
  });
});

describe('sessions', () => {
  it('stores only a hash of the token, so the collection is not a set of working sessions', async () => {
    const { body } = await signup();
    const stored = await Session.findOne({});
    expect(stored._id).not.toBe(body.token);
    expect(stored._id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('survives a server restart, because it is in the database', async () => {
    const token = await createSession({ kind: 'operator' });
    expect((await readSession(token)).kind).toBe('operator');
  });

  it('refuses an expired session before the TTL sweep removes it', async () => {
    const { body } = await signup();
    await Session.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get('/api/auth/me').set(auth(body.token))).statusCode).toBe(401);
  });
});

describe('the account', () => {
  let token;
  beforeEach(async () => {
    token = (await signup()).body.token;
  });

  it('updates the profile, and keeps a handle unique', async () => {
    const res = await request(app).patch('/api/auth/me').set(auth(token)).send({ displayName: '  Ada L. ', bio: 'Rye.', handle: '@ada_rye' });
    expect(res.body).toMatchObject({ displayName: 'Ada L.', bio: 'Rye.', handle: 'ada_rye' });

    await signup({ ...ADA, email: 'b@example.com', handle: 'bea' });
    const clash = await request(app).patch('/api/auth/me').set(auth(token)).send({ handle: 'bea' });
    expect(clash.statusCode).toBe(409);
  });

  it('changes the password, signing every other device out', async () => {
    const other = (await request(app).post('/api/auth/login').send({ email: ADA.email, password: ADA.password })).body.token;
    const bad = await request(app).post('/api/auth/password').set(auth(token)).send({ current: 'nope', next: 'a new long password' });
    expect(bad.statusCode).toBe(401);

    const res = await request(app).post('/api/auth/password').set(auth(token)).send({ current: ADA.password, next: 'a new long password' });
    expect(res.body.token).toEqual(expect.any(String));
    expect((await request(app).get('/api/auth/me').set(auth(other))).statusCode).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth(res.body.token))).statusCode).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: ADA.email, password: 'a new long password' });
    expect(login.statusCode).toBe(200);
  });

  it('exports everything the server holds for it', async () => {
    const user = await User.findOne({});
    await PublishedRecipe.create({ authorId: user._id, authorHandle: 'ada_bakes', sourceLocalId: 'l1', slug: 'rye', title: 'Rye' });
    const res = await request(app).get('/api/auth/export').set(auth(token));
    expect(res.headers['content-disposition']).toMatch(/proof-account\.json/);
    expect(res.body.account.email).toBe('ada@example.com');
    expect(res.body.published.map((p) => p.title)).toEqual(['Rye']);
  });

  it('deletes only with the password, and takes its published recipes down with it', async () => {
    const user = await User.findOne({});
    await PublishedRecipe.create({ authorId: user._id, authorHandle: 'ada_bakes', sourceLocalId: 'l1', slug: 'rye', title: 'Rye' });

    const refused = await request(app).delete('/api/auth/me').set(auth(token)).send({ password: 'wrong' });
    expect(refused.statusCode).toBe(401);
    expect(await User.countDocuments()).toBe(1);

    const res = await request(app).delete('/api/auth/me').set(auth(token)).send({ password: ADA.password });
    expect(res.statusCode).toBe(200);
    expect(await User.countDocuments()).toBe(0);
    expect(await PublishedRecipe.countDocuments()).toBe(0);
    expect(await Session.countDocuments()).toBe(0);
  });
});

describe('the operator PIN', () => {
  afterEach(() => {
    delete process.env.ADMIN_PIN;
  });

  it('opens an operator session that the operator routes accept, and a user session does not', async () => {
    process.env.ADMIN_PIN = '4321';
    const pin = await request(app).post('/api/auth/pin').send({ pin: '4321' });
    expect((await request(app).get('/api/library').set(auth(pin.body.token))).statusCode).toBe(200);

    const user = (await signup()).body.token;
    expect((await request(app).get('/api/library').set(auth(user))).statusCode).toBe(401);
  });
});
