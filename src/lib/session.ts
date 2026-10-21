import { useCallback, useSyncExternalStore } from 'react';
import type { PublishedRecipe, Recipe } from './types';

/*
 * Who is here, what is theirs, and what they may do.
 *
 * The UI used to ask one question everywhere: "is this the admin?" In a
 * multi-user app that is three different questions, and they have different
 * shapes (LAUNCH_PLAN.md, Phase 0 C2):
 *
 *   useSession()     who am I — anonymous, an account, and/or the site operator
 *   useOwnership(r)  is this record mine — per record
 *   usePlan()        what may I do — per feature
 *
 * The account is kept on the device beside its session token, so the app knows
 * who is signed in with no network. It is refreshed from the server whenever
 * the server can be reached (useAccountRefresh), which is also how a session
 * ended elsewhere — a password change, a deleted account — reaches this device.
 */

const OPERATOR_TOKEN_KEY = 'adminToken';
const USER_TOKEN_KEY = 'proof.session';
const ACCOUNT_KEY = 'proof.account';
const CHANGE_EVENT = 'session-changed';

/** The signed-in account, as the server describes it to its holder. */
export interface Account {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  bio: string;
  emailVerified: boolean;
  plan: 'free' | 'pro';
  pro: boolean;
  joinedAt: string;
  planExpiresAt: string | null;
  ai?: { used: number; limit: number | null; period: string };
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private browsing with storage blocked: the session lasts this page only.
  }
};

const changed = () => window.dispatchEvent(new Event(CHANGE_EVENT));

export const operatorToken = (): string | null => read(OPERATOR_TOKEN_KEY);
export const userToken = (): string | null => read(USER_TOKEN_KEY);

export function setOperatorToken(token: string | null) {
  write(OPERATOR_TOKEN_KEY, token);
  changed();
}

/** Signs this device in (token + account) or out (null). */
export function setAccount(token: string | null, account: Account | null = null) {
  write(USER_TOKEN_KEY, token);
  write(ACCOUNT_KEY, token && account ? JSON.stringify(account) : null);
  changed();
}

/** Replaces the stored account details, keeping the session. */
export function updateAccount(account: Account) {
  if (!userToken()) return;
  write(ACCOUNT_KEY, JSON.stringify(account));
  changed();
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

export interface Session {
  /** The signed-in account, or null. */
  user: Account | null;
  /** Holds the operator PIN: moderation, backups, takedowns. Not a user role. */
  isOperator: boolean;
}

// useSyncExternalStore needs the same object back while nothing has changed.
let snapshotKey = '';
let snapshot: Session = { user: null, isOperator: false };

function readSession(): Session {
  const op = operatorToken();
  const token = userToken();
  const account = token ? read(ACCOUNT_KEY) : null;
  const key = `${op ? 1 : 0}|${account ?? ''}`;
  if (key !== snapshotKey) {
    let user: Account | null = null;
    try {
      user = account ? (JSON.parse(account) as Account) : null;
    } catch {
      user = null;
    }
    snapshotKey = key;
    snapshot = { user, isOperator: !!op };
  }
  return snapshot;
}

const SERVER_SESSION: Session = { user: null, isOperator: false };

export function useSession() {
  const session = useSyncExternalStore(subscribe, readSession, () => SERVER_SESSION);
  const signOutOperator = useCallback(() => setOperatorToken(null), []);
  return { session, signOutOperator };
}

/**
 * Whether a record belongs to the person looking at it.
 *
 * A record in the device's own cookbook is theirs, including one saved from the
 * shared cookbook (that is a fork, and theirs to edit). A recipe read from the
 * shared cookbook is someone else's — unless the signed-in account published it.
 */
export function useOwnership(record: Recipe | PublishedRecipe | null | undefined) {
  const { session } = useSession();
  const isLocal = !!record && 'deletedAt' in record;
  const isFork = isLocal && !!(record as Recipe).forkedFrom;
  const isAuthor =
    !!record && !isLocal && !!session.user && (record as PublishedRecipe).authorHandle === session.user.handle;
  return { isMine: isLocal, isFork, canEdit: isLocal, isAuthor };
}

/** "3 of 5 left this month", or null when the account has no AI allowance to report. */
export function aiAllowanceLine(account: Account | null): string | null {
  if (!account?.emailVerified || !account.ai) return null;
  if (account.ai.limit === null) return 'Unlimited';
  const left = Math.max(0, account.ai.limit - account.ai.used);
  return `${left} of ${account.ai.limit} left this month`;
}

export type Feature = 'ai' | 'sync' | 'postBakeResults' | 'publish';

/**
 * What the current person may use.
 *
 * The AI costs money per call, so it is open to the operator, and to accounts
 * with a confirmed email as a monthly allowance the server counts. Publishing
 * needs a confirmed email too: it puts words in front of strangers. Sync and
 * posting bake results are Pro features (Phase 4).
 */
export function usePlan() {
  const { session } = useSession();
  const verified = !!session.user?.emailVerified;
  const can = useCallback(
    (feature: Feature) => {
      if (feature === 'ai') return session.isOperator || verified;
      if (feature === 'publish') return verified;
      return false;
    },
    [session.isOperator, verified],
  );
  return { plan: session.user?.plan ?? ('free' as const), can };
}
