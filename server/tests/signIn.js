import { User } from '../models/User.js';
import { createSession } from '../middleware/auth.js';

/*
 * An account and a live session for it, for tests that need someone signed
 * in — the owner for the site's tools, a Pro account for the AI. The password
 * hash is a placeholder: nobody signs in with it.
 */
export async function signedIn(handle, { role = 'user', plan = 'free', verified = true } = {}) {
  const user = await User.create({
    email: `${handle}@example.com`,
    handle,
    role,
    plan,
    passwordHash: 'not-a-hash',
    emailVerifiedAt: verified ? new Date() : null,
  });
  const token = await createSession({ userId: user._id });
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}
