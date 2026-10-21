import { useCallback, useSyncExternalStore } from 'react';
import type { PublishedRecipe, Recipe } from './types';

/*
 * Who is here, what is theirs, and what they may do.
 *
 * The UI used to ask one question everywhere: "is this the admin?" In a
 * multi-user app that is three different questions, and they have different
 * shapes (LAUNCH_PLAN.md, Phase 0 C2):
 *
 *   useSession()     who am I — today, anonymous, or the site operator
 *   useOwnership(r)  is this record mine — per record
 *   usePlan()        what may I do — per feature
 *
 * Accounts arrive in Phase 2 and plans in Phase 4. These hooks are the seam
 * they plug into, so no screen has to be rewritten when they do.
 */

const OPERATOR_TOKEN_KEY = 'adminToken';
const CHANGE_EVENT = 'session-changed';

export const operatorToken = (): string | null => {
  try {
    return localStorage.getItem(OPERATOR_TOKEN_KEY);
  } catch {
    return null;
  }
};

export function setOperatorToken(token: string | null) {
  if (token) localStorage.setItem(OPERATOR_TOKEN_KEY, token);
  else localStorage.removeItem(OPERATOR_TOKEN_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
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
  /** Signed-in account. Always null until accounts exist (Phase 2). */
  user: null;
  /** Holds the operator PIN: moderation, backups, takedowns. Not a user role. */
  isOperator: boolean;
}

export function useSession() {
  const token = useSyncExternalStore(subscribe, operatorToken, () => null);
  const signOutOperator = useCallback(() => setOperatorToken(null), []);
  const session: Session = { user: null, isOperator: !!token };
  return { session, signOutOperator };
}

/**
 * Whether a record belongs to the person looking at it.
 *
 * A record in the device's own cookbook is theirs, including one saved from the
 * shared cookbook (that is a fork, and theirs to edit). A recipe read from the
 * shared cookbook is someone else's until accounts can say otherwise.
 */
export function useOwnership(record: Recipe | PublishedRecipe | null | undefined) {
  const isLocal = !!record && 'deletedAt' in record;
  const isFork = isLocal && !!(record as Recipe).forkedFrom;
  return { isMine: isLocal, isFork, canEdit: isLocal };
}


export type Feature = 'ai' | 'sync' | 'postBakeResults';

/**
 * What the current person may use. Everyone is on the free plan until Phase 4.
 * AI runs on the server and costs money per call, so until accounts carry a
 * monthly quota it is open to the operator only.
 */
export function usePlan() {
  const { session } = useSession();
  const can = useCallback(
    (feature: Feature) => (feature === 'ai' ? session.isOperator : false),
    [session.isOperator],
  );
  return { plan: 'free' as const, can };
}
