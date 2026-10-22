import { Clock, Globe, Lock, PencilLine } from 'lucide-react';
import { cn } from '../../lib/cn';

/*
 * Where a recipe stands with the shared cookbook, in words.
 *
 * "Private · this device", "Waiting for review", "Public", "Public · edits not
 * yet shared". An icon beside each is a second cue, never the only one.
 * Getting this wrong is how people publish by accident, so it is said plainly.
 */

export type PublishStateValue = 'local' | 'pending' | 'live' | 'edits';

const STATES: Record<PublishStateValue, { words: string; Icon: typeof Lock }> = {
  local: { words: 'Private · only on this device', Icon: Lock },
  pending: { words: 'Waiting for review', Icon: Clock },
  live: { words: 'Public in the shared cookbook', Icon: Globe },
  edits: { words: 'Public · edits not yet shared', Icon: PencilLine },
};

export interface PublishStateProps {
  state: PublishStateValue;
  className?: string;
}

export function PublishState({ state, className }: PublishStateProps) {
  const { words, Icon } = STATES[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-ink-2', className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {words}
    </span>
  );
}
