import { useEffect } from 'react';
import { api, ApiError } from './api';
import { updateAccount, userToken } from './session';

/*
 * Keeps the stored account in step with the server.
 *
 * The account is read from the device so the app knows who is signed in with
 * no network; this refreshes it whenever the server can be reached — on start,
 * on reconnecting, and on returning to the tab — so a confirmed email or a new
 * month's AI allowance shows up, and a session ended elsewhere signs this
 * device out (api.ts does that on the 401). Unreachable is not an error here:
 * the stored account stands until the server can say otherwise.
 */
export async function refreshAccount() {
  if (!userToken()) return;
  try {
    updateAccount(await api.me());
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }
}

export function useAccountRefresh() {
  useEffect(() => {
    void refreshAccount();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshAccount();
    };
    window.addEventListener('online', refreshAccount);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', refreshAccount);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
