/*
 * Accounts: what a valid one is, how its password is kept, what of it may be
 * shown, and how it is exported and deleted.
 */
import { hash, verify } from '@node-rs/argon2';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PublishedRecipe } from '../models/PublishedRecipe.js';
import { Recipe } from '../models/Recipe.js';
import { BakeLog } from '../models/BakeLog.js';
import { Note } from '../models/Note.js';
import { Pantry } from '../models/Pantry.js';
import { aiAllowance } from './aiQuota.js';
import { Rating } from '../models/Rating.js';
import { Comment } from '../models/Comment.js';
import { recountRatings } from './publishing.js';

export const PASSWORD_MIN = 10;
const PASSWORD_MAX = 200;

/*
 * Handles that would read as the site speaking, or that collide with a route.
 * "proof" is the handle the seeded library is published under, which the
 * operator claims (scripts/claim-library.js); nobody else may sign up as it.
 */
const RESERVED_HANDLES = new Set([
  'proof', 'admin', 'administrator', 'operator', 'moderator', 'mod', 'support', 'help', 'staff', 'team',
  'api', 'r', 'u', 'discover', 'settings', 'welcome', 'new', 'edit', 'recipe', 'recipes', 'gallery',
  'analytics', 'pantry', 'grocery', 'notes', 'lab', 'login', 'signup', 'account', 'me', 'null', 'undefined',
]);

export class AccountError extends Error {
  status: number;
  field?: string;
  constructor(message: string, status = 400, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const normaliseEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export function checkEmail(email: string) {
  // Deliberately loose: the confirmation email is the real test of an address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new AccountError("That doesn't look like an email address.", 400, 'email');
  }
}

export function checkHandle(raw: unknown): string {
  const handle = typeof raw === 'string' ? raw.trim().replace(/^@/, '').toLowerCase() : '';
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    throw new AccountError('A handle is 3 to 24 letters, numbers or underscores.', 400, 'handle');
  }
  if (RESERVED_HANDLES.has(handle)) throw new AccountError('That handle is reserved. Pick another.', 409, 'handle');
  return handle;
}

export function checkPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    throw new AccountError(`A password needs at least ${PASSWORD_MIN} characters.`, 400, 'password');
  }
  if (password.length > PASSWORD_MAX) throw new AccountError('That password is too long.', 400, 'password');
  return password;
}

/** argon2id at the library's defaults, which are OWASP's recommended minimum (19 MiB, t=2). */
export const hashPassword = (password: string) => hash(password);

/*
 * A hash of nothing in particular, checked when the email is unknown, so a
 * sign-in for an address with no account takes as long as one with a wrong
 * password. Without it, timing tells an attacker which emails have accounts.
 */
let decoy: Promise<string> | null = null;
export async function checkPasswordAgainst(passwordHash: string | null, password: string) {
  if (!passwordHash) {
    decoy ??= hash('decoy-password-for-timing');
    await verify(await decoy, password).catch(() => false);
    return false;
  }
  return verify(passwordHash, password).catch(() => false);
}

type UserDoc = InstanceType<typeof User>;

/** What anyone may see: the profile. */
export const publicUser = (user: UserDoc) => ({
  handle: user.handle,
  displayName: user.displayName,
  bio: user.bio,
  pro: user.plan === 'pro',
  joinedAt: user.createdAt,
});

/** What the account holder sees of their own account. */
export const privateUser = (user: UserDoc) => ({
  ...publicUser(user),
  id: user._id,
  email: user.email,
  emailVerified: !!user.emailVerifiedAt,
  plan: user.plan,
  planExpiresAt: user.planExpiresAt,
  ai: aiAllowance(user),
});

/** Everything the server holds about an account, as one document (GDPR access). */
export async function exportAccount(user: UserDoc) {
  const [published, ratings, comments, recipes, bakeLogs, notes, pantry] = await Promise.all([
    PublishedRecipe.find({ authorId: user._id }).lean(),
    Rating.find({ userId: user._id }).lean(),
    Comment.find({ userId: user._id }).lean(),
    Recipe.find({ ownerId: user._id }).lean(),
    BakeLog.find({ ownerId: user._id }).lean(),
    Note.find({ ownerId: user._id }).lean(),
    Pantry.find({ ownerId: user._id }).lean(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account: privateUser(user),
    published,
    ratings,
    comments,
    synced: { recipes, bakeLogs, notes, pantry },
  };
}

/*
 * Deletes an account and everything the server holds for it. The cookbook on
 * the person's devices is theirs and is not touched; published recipes come
 * down, because nobody may keep publishing in the name of an account that no
 * longer exists. Copies other people saved stay on their devices.
 */
export async function deleteAccount(user: UserDoc) {
  // Their ratings come off the recipes they rated, and the counts follow.
  const rated = await Rating.distinct('publishedId', { userId: user._id });
  await Promise.all([
    PublishedRecipe.deleteMany({ authorId: user._id }),
    Rating.deleteMany({ userId: user._id }),
    Comment.deleteMany({ userId: user._id }),
    Recipe.deleteMany({ ownerId: user._id }),
    BakeLog.deleteMany({ ownerId: user._id }),
    Note.deleteMany({ ownerId: user._id }),
    Pantry.deleteMany({ ownerId: user._id }),
    Session.deleteMany({ userId: user._id }),
  ]);
  await User.deleteOne({ _id: user._id });
  await Promise.all(rated.map((id) => recountRatings(String(id))));
}
