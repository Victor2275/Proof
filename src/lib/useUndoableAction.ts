import { useCallback } from 'react';
import { useToast } from '../components/ui/toastContext';
import { haptic } from './haptics';

/*
 * Act now, offer the way back: the replacement for "Are you sure?".
 *
 * The action runs at once. A toast reports it with Undo for six seconds, and
 * Undo runs the inverse — for a delete, clearing the tombstone the delete left
 * (`repo.restore`), which is why every record is soft-deleted in the first
 * place. If the action itself fails, the toast says so instead, and nothing
 * needs undoing.
 */
export interface UndoableAction {
  /** What happened, in the past tense: "Recipe deleted". */
  message: string;
  run: () => Promise<unknown>;
  undo: () => Promise<unknown>;
  /** The report if `run` throws; the error's own message is used when this is left out. */
  failure?: string;
}

export function useUndoableAction() {
  const toast = useToast();

  return useCallback(
    async ({ message, run, undo, failure }: UndoableAction): Promise<boolean> => {
      try {
        await run();
      } catch (err) {
        toast.show({
          message: failure ?? (err instanceof Error ? err.message : 'That did not work. Try again.'),
          tone: 'fault',
        });
        return false;
      }
      haptic('warning');
      toast.show({
        message,
        action: {
          label: 'Undo',
          onAction: () => {
            haptic('light');
            undo().catch(() => {
              toast.show({ message: "That couldn't be undone. It may already be gone from this device.", tone: 'fault' });
            });
          },
        },
      });
      return true;
    },
    [toast],
  );
}
