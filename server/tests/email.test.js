import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { EmailToken } from '../models/EmailToken.js';

let mongoServer;
let sent;

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
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), EmailToken.deleteMany({})]);
  sent = [];
  process.env.RESEND_API_KEY = 're_test';
  process.env.PUBLIC_ORIGIN = 'https://proof.example';
  // Resend, stood in for: record what would have been sent.
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    if (String(url).startsWith('https://api.resend.com/')) {
      sent.push(JSON.parse(init.body));
      return new Response('{"id":"x"}', { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.PUBLIC_ORIGIN;
});

const ADA = { email: 'ada@example.com', password: 'correct horse battery', handle: 'ada' };
const tokenIn = (message) => message.text.match(/token=([\w-]+)/)[1];
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('confirming an email', () => {
  it('sends a link on sign-up that confirms the account once', async () => {
    const signup = await request(app).post('/api/auth/signup').send(ADA);
    expect(signup.body.verificationSent).toBe(true);
    expect(sent[0].to).toEqual(['ada@example.com']);
    expect(sent[0].text).toContain('https://proof.example/verify?token=');

    const token = tokenIn(sent[0]);
    const res = await request(app).post('/api/auth/verify').send({ token });
    expect(res.body.user.emailVerified).toBe(true);
    // A link works once.
    expect((await request(app).post('/api/auth/verify').send({ token })).statusCode).toBe(400);
  });

  it('stores only a hash of the link, so the collection holds no working links', async () => {
    await request(app).post('/api/auth/signup').send(ADA);
    const stored = await EmailToken.findOne({});
    expect(stored._id).not.toBe(tokenIn(sent[0]));
    expect(stored._id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses an expired link, and a resend replaces the last one', async () => {
    const { body } = await request(app).post('/api/auth/signup').send(ADA);
    const first = tokenIn(sent[0]);
    await request(app).post('/api/auth/verify/resend').set(auth(body.token));
    expect((await request(app).post('/api/auth/verify').send({ token: first })).statusCode).toBe(400);

    await EmailToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).post('/api/auth/verify').send({ token: tokenIn(sent[1]) });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/expired or was already used/);
  });

  it("says plainly when the site can't send email, and still makes the account", async () => {
    delete process.env.RESEND_API_KEY;
    const signup = await request(app).post('/api/auth/signup').send(ADA);
    expect(signup.statusCode).toBe(201);
    expect(signup.body.verificationSent).toBe(false);
    const resend = await request(app).post('/api/auth/verify/resend').set(auth(signup.body.token));
    expect(resend.statusCode).toBe(503);
    expect(resend.body.error).toMatch(/Ask its operator/);
  });
});

describe('resetting a password', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(ADA);
    sent = [];
  });

  it('gives the same answer whether or not the account exists', async () => {
    const known = await request(app).post('/api/auth/password/forgot').send({ email: 'ADA@example.com' });
    const unknown = await request(app).post('/api/auth/password/forgot').send({ email: 'nobody@example.com' });
    expect(known.body).toEqual(unknown.body);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('https://proof.example/reset?token=');
  });

  it('sets a new password from the link, signing every device out', async () => {
    const before = (await request(app).post('/api/auth/login').send(ADA)).body.token;
    await request(app).post('/api/auth/password/forgot').send({ email: ADA.email });
    const token = tokenIn(sent[0]);

    expect((await request(app).post('/api/auth/password/reset').send({ token, password: 'short' })).body.field).toBe('password');
    const res = await request(app).post('/api/auth/password/reset').send({ token, password: 'a brand new password' });
    expect(res.statusCode).toBe(200);

    expect((await request(app).get('/api/auth/me').set(auth(before))).statusCode).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: ADA.email, password: 'a brand new password' });
    expect(login.statusCode).toBe(200);
    // Following the emailed link proves the address too.
    expect(login.body.user.emailVerified).toBe(true);
    expect((await request(app).post('/api/auth/password/reset').send({ token, password: 'another password!' })).statusCode).toBe(400);
  });
});
