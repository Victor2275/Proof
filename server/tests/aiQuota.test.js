import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { createSession } from '../middleware/auth.js';
import { aiAllowance, chargeAi, FREE_AI_PER_MONTH } from '../services/aiQuota.js';

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
  process.env.ADMIN_PIN = '9999';
  await Promise.all([User.deleteMany({}), Session.deleteMany({})]);
});

afterEach(() => {
  delete process.env.ADMIN_PIN;
});

async function account({ verified = true, plan = 'free' } = {}) {
  const user = await User.create({
    email: 'ada@example.com', handle: 'ada', passwordHash: 'x', plan,
    emailVerifiedAt: verified ? new Date() : null,
  });
  return { user, token: await createSession({ kind: 'user', userId: user._id }) };
}

/** A call that reaches the AI route and fails there (a name that does not resolve): it should cost nothing. */
const extract = (token) => request(app).post('/api/extract').set('Authorization', `Bearer ${token}`).send({ url: 'not-a-url.invalid' });
/** A call that the route answers with a 400 before any AI runs. */
const analyse = (token) => request(app).post('/api/ai-substitutions').set('Authorization', `Bearer ${token}`).send({});

describe('the AI allowance', () => {
  it('asks a stranger to sign in, and an unconfirmed account to confirm its email', async () => {
    expect((await request(app).post('/api/extract').send({ url: 'x' })).statusCode).toBe(401);
    const { token } = await account({ verified: false });
    const res = await extract(token);
    expect(res.statusCode).toBe(403);
    expect(res.body.unverified).toBe(true);
  });

  it('charges a confirmed account one action per call, and refunds a failed one', async () => {
    const { user, token } = await account();
    expect((await extract(token)).statusCode).toBe(500); // fails at the route: refunded
    await new Promise((r) => setTimeout(r, 100));
    expect(aiAllowance(await User.findById(user._id)).used).toBe(0);
  });

  it('stops at the monthly limit, with a message that says when it resets', async () => {
    const { user } = await account();
    for (let i = 0; i < FREE_AI_PER_MONTH; i++) expect(await chargeAi(user._id)).toBe(true);
    expect(await chargeAi(user._id)).toBe(false);

    const token = await createSession({ kind: 'user', userId: user._id });
    const res = await analyse(token);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/resets on the 1st/);
  });

  it('starts the count again in a new month', async () => {
    const { user } = await account();
    const august = new Date('2026-08-31T23:00:00Z');
    for (let i = 0; i < FREE_AI_PER_MONTH; i++) await chargeAi(user._id, august);
    expect(await chargeAi(user._id, august)).toBe(false);
    expect(await chargeAi(user._id, new Date('2026-09-01T01:00:00Z'))).toBe(true);
    expect(aiAllowance(await User.findById(user._id), new Date('2026-09-02T00:00:00Z'))).toEqual({
      used: 1, limit: FREE_AI_PER_MONTH, period: '2026-09',
    });
  });

  it('does not overspend when calls race for the last action', async () => {
    const { user } = await account();
    for (let i = 0; i < FREE_AI_PER_MONTH - 1; i++) await chargeAi(user._id);
    const results = await Promise.all([chargeAi(user._id), chargeAi(user._id), chargeAi(user._id)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('is unlimited for the operator and for Pro', async () => {
    const op = await createSession({ kind: 'operator' });
    expect((await analyse(op)).statusCode).toBe(400); // reached the route
    const { token } = await account({ plan: 'pro' });
    expect((await analyse(token)).statusCode).toBe(400);
  });

  it("is reported on the account, so the AI sheets can show what's left", async () => {
    const { token } = await account();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.ai).toMatchObject({ used: 0, limit: FREE_AI_PER_MONTH });
  });
});
