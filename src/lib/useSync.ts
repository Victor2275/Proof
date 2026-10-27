import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/ui/toastContext';
import { OUTBOX_EVENT } from './repo/outbox';
import { useSession } from './session';
import { canSync, getSyncStatus, subscribeSyncStatus, syncNow, SYNCED_EVENT } from './sync';

/*
 * When a Pro account syncs (lib/sync.ts): on start and on signing in, a
 * couple of seconds after any change here, on coming back online, and on
 * returning to the app. What arrives is read again by every screen.
 */

const AFTER_CHANGE_MS = 2000;

export function useAutoSync() {
  const client = useQueryClient();
  const toast = useToast();
  const { session } = useSession();
  const who = `${session.user?.id ?? ''}|${session.user?.plan ?? ''}|${session.user?.emailVerified ?? ''}`;

  useEffect(() => {
    void syncNow();
  }, [who]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      if (!canSync()) return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), AFTER_CHANGE_MS);
    };
    const now = () => void syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') now();
    };
    const onSynced = (e: Event) => {
      void client.invalidateQueries();
      const kept = (e as CustomEvent<{ keptAsDrafts: string[] }>).detail?.keptAsDrafts ?? [];
      if (kept.length) {
        toast.show({
          message: kept.length === 1
            ? `${kept[0]} changed on another device. Your edit is kept as a draft.`
            : `${kept.length} recipes changed on another device. Your edits are kept as drafts.`,
        });
      }
    };
    window.addEventListener(OUTBOX_EVENT, soon);
    window.addEventListener('online', now);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(OUTBOX_EVENT, soon);
      window.removeEventListener('online', now);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(SYNCED_EVENT, onSynced);
    };
  }, [client, toast]);
}

export function useSyncStatus() {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}
