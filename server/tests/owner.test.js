import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User.js';
import { ModerationLog } from '../models/ModerationLog.js';
import { makeOwner } from '../services/owner.js';

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
  await Promise.all([User.deleteMany({}), ModerationLog.deleteMany({})]);
});

const account = (handle, extra = {}) =>
  User.create({ email: `${handle}@example.com`, handle, passwordHash: 'x', ...extra });

describe('making the owner (scripts/make-owner.js)', () => {
  it('confirms the account, puts it on Pro with no end date, and makes it the owner', async () => {
    const mad = await account('madboy2275', { role: 'moderator', planExpiresAt: new Date('2027-01-01') });
    const said = await makeOwner(mad);

    const after = await User.findById(mad._id);
    expect(after).toMatchObject({ role: 'owner', plan: 'pro', planExpiresAt: null });
    expect(after.emailVerifiedAt).toBeInstanceOf(Date);
    expect(said).toContain('@madboy2275 is the owner.');
    const log = (await ModerationLog.find().lean()).map((e) => [e.action, e.actorKind]);
    expect(log).toEqual([['account.confirm', 'operator'], ['account.promote', 'operator']]);
  });

  it('lifts a suspension, so the owner can sign in', async () => {
    const mad = await account('madboy2275', { suspendedAt: new Date(), suspendedReason: 'Oops' });
    await makeOwner(mad);
    expect((await User.findById(mad._id)).suspendedAt).toBeNull();
  });

  it('keeps one owner: naming another moves the role, and the old owner stays a moderator', async () => {
    const first = await account('first', { role: 'owner', plan: 'pro' });
    const second = await account('second');
    await makeOwner(second);
    expect((await User.findById(first._id)).role).toBe('moderator');
    expect((await User.findById(second._id)).role).toBe('owner');
    expect(await User.countDocuments({ role: 'owner' })).toBe(1);
  });

  it('changes nothing when run again', async () => {
    const mad = await account('madboy2275');
    await makeOwner(mad);
    const said = await makeOwner(await User.findById(mad._id));
    expect(said).toEqual(['@madboy2275 was already the owner.']);
  });
});
