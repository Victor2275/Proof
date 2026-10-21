import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * A silkscreened tag: LIVE on a published recipe's tile, PRO on a profile
 * (decisions B6, B14). Printed on the panel, not lit — a tag is a fact about
 * the thing, not a thing happening — so it carries no colour at all.
 */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'label-silkscreen inline-flex items-center rounded-key border border-rule px-1.5 py-0.5 text-[0.65rem] leading-none text-ink-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
