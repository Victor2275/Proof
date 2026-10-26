import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { ModerationLog } from '../models/ModerationLog.js';
import { createSession } from '../middleware/auth.js';
import { hashPassword } from '../services/accounts.js';

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
  // With a PIN set, only a real operator session or a moderator gets in.
  process.env.ADMIN_PIN = '1234';
  await Promise.all([User, Session, PublishedRecipe, Comment, Report, ModerationLog].map((M) => M.deleteMany({})));
});

afterEach(() => {
  delete process.env.ADMIN_PIN;
});

const PASSWORD = 'correct horse battery';

async function account(handle, { verified = true, role = 'user' } = {}) {
  const user = await User.create({
    email: `${handle}@example.com`, handle, role, passwordHash: await hashPassword(PASSWORD),
    emailVerifiedAt: verified ? new Date() : null,
  });
  return { user, token: await createSession({ kind: 'user', userId: user._id }) };
}

const as = (token) => ({ Authorization: `Bearer ${token}` });
const api = (method, path, token, body) => {
  const r = request(app)[method](path);
  if (token) r.set(as(token));
  return body ? r.send(body) : r;
};

describe('who may moderate', () => {
  it('lets a moderator and the operator in, refuses an ordinary account with 403 and nobody with 401', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const ada = await account('ada');
    const op = await createSession({ kind: 'operator' });

    expect((await api('get', '/api/accounts', mod.token)).statusCode).toBe(200);
    expect((await api('get', '/api/moderation/queue', mod.token)).statusCode).toBe(200);
    expect((await api('get', '/api/accounts', op)).statusCode).toBe(200);
    // 403, not 401: a 401 would sign Ada's device out.
    expect((await api('get', '/api/accounts', ada.token)).statusCode).toBe(403);
    expect((await api('get', '/api/moderation/queue', ada.token)).statusCode).toBe(403);
    expect((await api('get', '/api/accounts')).statusCode).toBe(401);
  });

  it('tells the account holder and the public that the account is a moderator', async () => {
    const mod = await account('mod', { role: 'moderator' });
    expect((await api('get', '/api/auth/me', mod.token)).body.moderator).toBe(true);
    expect((await api('get', '/api/profiles/mod')).body.profile.moderator).toBe(true);
    const ada = await account('ada');
    expect((await api('get', '/api/auth/me', ada.token)).body.moderator).toBe(false);
  });
});

describe('viewing accounts', () => {
  it('lists accounts newest first, with email and status but never the password', async () => {
    const mod = await account('mod', { role: 'moderator' });
    await account('ada', { verified: false });
    await account('bea');

    const res = await api('get', '/api/accounts', mod.token);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((a) => a.handle)).toEqual(['bea', 'ada', 'mod']);
    expect(res.body.items[1]).toMatchObject({ email: 'ada@example.com', emailVerified: false, moderator: false, suspended: false });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
  });

  it('filters by status and searches handle, email and name', async () => {
    const mod = await account('mod', { role: 'moderator' });
    await account('ada', { verified: false });
    await account('bea');

    const handles = async (query) => (await api('get', `/api/accounts?${query}`, mod.token)).body.items.map((a) => a.handle);
    expect(await handles('filter=unconfirmed')).toEqual(['ada']);
    expect(await handles('filter=moderators')).toEqual(['mod']);
    expect(await handles('q=@BE')).toEqual(['bea']);
    expect(await handles('q=ada%40example')).toEqual(['ada']);
    // A search is text, not a pattern.
    expect(await handles('q=.*')).toEqual([]);
  });

  it('opens an account with what it published, its comments, reports against it, and its log', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const ada = await account('ada');
    const recipe = await PublishedRecipe.create({ authorId: ada.user._id, authorHandle: 'ada', sourceLocalId: 'a', slug: 'rye', title: 'Rye', moderation: { state: 'approved' } });
    await Comment.create({ publishedId: recipe._id, userId: ada.user._id, authorHandle: 'ada', body: 'Lovely crumb', moderation: { state: 'approved' } });
    await Report.create({ targetType: 'recipe', targetId: recipe._id, reason: 'Copied' });
    await api('post', `/api/accounts/${ada.user._id}/signout`, mod.token);

    const res = await api('get', `/api/accounts/${ada.user._id}`, mod.token);
    expect(res.body.account.handle).toBe('ada');
    expect(res.body.sessions).toBe(0);
    expect(res.body.published.map((r) => r.title)).toEqual(['Rye']);
    expect(res.body.comments[0]).toMatchObject({ body: 'Lovely crumb', recipe: { title: 'Rye', slug: 'rye' } });
    expect(res.body.reports.map((r) => r.reason)).toEqual(['Copied']);
    expect(res.body.log[0]).toMatchObject({ action: 'account.signout', actorHandle: 'mod' });
  });
});

describe('confirming and making moderators', () => {
  it('confirms an account by hand, once, and logs who did it', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const ada = await account('ada', { verified: false });

    const res = await api('post', `/api/accounts/${ada.user._id}/confirm`, mod.token);
    expect(res.body.account.emailVerified).toBe(true);
    expect((await User.findById(ada.user._id)).emailVerifiedAt).toBeInstanceOf(Date);
    await api('post', `/api/accounts/${ada.user._id}/confirm`, mod.token);
    const log = await ModerationLog.find({ targetId: ada.user._id }).lean();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action: 'account.confirm', actorKind: 'moderator', actorHandle: 'mod', label: '@ada' });
  });

  it('makes a confirmed account a moderator, and refuses an unconfirmed one', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const ada = await account('ada', { verified: false });
    expect((await api('post', `/api/accounts/${ada.user._id}/role`, mod.token, { role: 'moderator' })).statusCode).toBe(409);

    await api('post', `/api/accounts/${ada.user._id}/confirm`, mod.token);
    const res = await api('post', `/api/accounts/${ada.user._id}/role`, mod.token, { role: 'moderator' });
    expect(res.body.account.moderator).toBe(true);
    // The new moderator can now moderate.
    expect((await api('get', '/api/accounts', ada.token)).statusCode).toBe(200);
  });

  it('lets a moderator remove another moderator, but nobody change their own role', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const other = await account('other', { role: 'moderator' });

    expect((await api('post', `/api/accounts/${mod.user._id}/role`, mod.token, { role: 'user' })).statusCode).toBe(400);
    const res = await api('post', `/api/accounts/${other.user._id}/role`, mod.token, { role: 'user' });
    expect(res.body.account.moderator).toBe(false);
    expect((await api('get', '/api/accounts', other.token)).statusCode).toBe(403);
    expect((await ModerationLog.findOne({ action: 'account.demote' })).label).toBe('@other');
  });

  it('refuses a role that is not one', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const ada = await account('ada');
    expect((await api('post', `/api/accounts/${ada.user._id}/role`, mod.token, { role: 'operator' })).statusCode).toBe(400);
  });
});

describe('suspending', () => {
  it('needs a reason, and never suspends a moderator or yourself', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const other = await account('other', { role: 'moderator' });
    const ada = await account('ada');

    expect((await api('post', `/api/accounts/${ada.user._id}/suspend`, mod.token, { reason: ' ' })).body.field).toBe('reason');
    expect((await api('post', `/api/accounts/${other.user._id}/suspend`, mod.token, { reason: 'x' })).statusCode).toBe(409);
    expect((await api('post', `/api/accounts/${mod.user._id}/suspend`, mod.token, { reason: 'x' })).statusCode).toBe(400);
  });

  it('signs the account out, refuses its sign-in with the reason, and hides what it published until lifted', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const ada = await account('ada');
    const recipe = await PublishedRecipe.create({ authorId: ada.user._id, authorHandle: 'ada', sourceLocalId: 'a', slug: 'rye', title: 'Rye', moderation: { state: 'approved' } });
    await Comment.create({ publishedId: recipe._id, userId: ada.user._id, authorHandle: 'ada', body: 'Spam link', moderation: { state: 'approved' } });

    const res = await api('post', `/api/accounts/${ada.user._id}/suspend`, mod.token, { reason: 'Posting spam' });
    expect(res.body.account).toMatchObject({ suspended: true, suspendedReason: 'Posting spam' });

    expect((await api('get', '/api/auth/me', ada.token)).statusCode).toBe(401);
    const login = await api('post', '/api/auth/login', null, { email: 'ada@example.com', password: PASSWORD });
    expect(login.statusCode).toBe(403);
    expect(login.body.error).toMatch(/suspended: Posting spam/);
    expect((await api('get', '/api/published/rye')).statusCode).toBe(404);
    expect((await api('get', '/api/profiles/ada')).statusCode).toBe(404);
    expect((await api('get', `/api/published/${recipe._id}/comments`)).body.items).toEqual([]);

    await api('post', `/api/accounts/${ada.user._id}/unsuspend`, mod.token);
    expect((await api('get', '/api/published/rye')).statusCode).toBe(200);
    expect((await api('post', '/api/auth/login', null, { email: 'ada@example.com', password: PASSWORD })).statusCode).toBe(200);
    expect((await api('get', `/api/published/${recipe._id}/comments`)).body.items).toHaveLength(1);
    expect((await ModerationLog.find().sort({ createdAt: 1 }).lean()).map((e) => e.action)).toEqual(['account.suspend', 'account.unsuspend']);
  });

  it('ignores a session that outlived a suspension', async () => {
    const ada = await account('ada');
    await User.updateOne({ _id: ada.user._id }, { suspendedAt: new Date() });
    expect((await api('get', '/api/auth/me', ada.token)).statusCode).toBe(401);
  });
});

describe('signing out everywhere', () => {
  it('ends every session the account has', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const ada = await account('ada');
    await createSession({ kind: 'user', userId: ada.user._id });

    await api('post', `/api/accounts/${ada.user._id}/signout`, mod.token);
    expect(await Session.countDocuments({ userId: ada.user._id })).toBe(0);
    expect((await api('get', '/api/auth/me', ada.token)).statusCode).toBe(401);
    expect((await api('get', '/api/auth/me', mod.token)).statusCode).toBe(200);
  });
});

describe('the moderation log', () => {
  it('records queue decisions by moderators and the operator, newest first', async () => {
    const mod = await account('mod', { role: 'moderator' });
    const op = await createSession({ kind: 'operator' });
    const recipe = await PublishedRecipe.create({ authorHandle: 'ada', sourceLocalId: 'a', slug: 'rye', title: 'Rye', moderation: { state: 'pending' } });

    await api('post', `/api/moderation/recipes/${recipe._id}`, mod.token, { action: 'reject', reason: 'Credit the source.' });
    await api('post', `/api/moderation/recipes/${recipe._id}`, op, { action: 'approve' });

    const log = (await api('get', '/api/moderation/log', mod.token)).body;
    expect(log.total).toBe(2);
    expect(log.items[0]).toMatchObject({ action: 'recipe.approve', actorKind: 'operator', label: 'Rye' });
    expect(log.items[1]).toMatchObject({ action: 'recipe.reject', actorKind: 'moderator', actorHandle: 'mod', reason: 'Credit the source.' });
  });
});
