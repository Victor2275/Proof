import { cn } from '../../lib/cn';

/*
 * Where a recipe stands with the shared cookbook (decisions B6, B7).
 *
 * Three positions on a short bank of keys — LOCAL, LIVE, and EDITS for a live
 * recipe changed since it was pushed — read the same way as the step row: the
 * position the recipe is in is lit, the rest are unlit. A recipe waiting for a
 * look is lit queued on LIVE; edits waiting to be pushed light EDITS as due,
 * because pushing them is the next thing to do. Nothing here is red: none of
 * it is happening now. A rejection is said in words beside it, not drawn.
 *
 * Getting this wrong is how people publish by accident, so the label says the
 * state in words as well as in light.
 */

export type PublishStateValue = 'local' | 'pending' | 'live' | 'edits';

const WORDS: Record<PublishStateValue, string> = {
  local: 'Only on this device',
  pending: 'Waiting for review',
  live: 'Live in the shared cookbook',
  edits: 'Live, with edits not yet pushed',
};

export interface PublishStateProps {
  state: PublishStateValue;
  className?: string;
}

export function PublishState({ state, className }: PublishStateProps) {
  const keys: { label: string; tone: string }[] = [
    { label: 'Local', tone: state === 'local' ? 'bg-key-done' : 'bg-key-unlit border border-ink-muted/20' },
    {
      label: state === 'pending' ? 'Queued' : 'Live',
      tone:
        state === 'pending'
          ? 'bg-key-queued'
          : state === 'live' || state === 'edits'
            ? 'bg-key-done'
            : 'bg-key-unlit border border-ink-muted/20',
    },
    { label: 'Edits', tone: state === 'edits' ? 'bg-key-due' : 'bg-key-unlit border border-ink-muted/20' },
  ];

  return (
    // The words carry the state for a screen reader; the keys are their picture.
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex gap-px" aria-hidden="true">
        {keys.map((k) => (
          <div key={k.label} className="flex flex-col items-center gap-1">
            <span className={cn('h-2.5 w-8 rounded-key', k.tone)} />
            <span className="label-silkscreen text-[0.6rem] text-silkscreen">{k.label}</span>
          </div>
        ))}
      </div>
      <span className="label-silkscreen text-ink-muted">{WORDS[state]}</span>
    </div>
  );
}
