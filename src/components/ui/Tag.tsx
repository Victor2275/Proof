import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * A small fact about a thing: Public on a shared recipe's tile, Pro on a
 * profile. A tonal pill — it states something, it does not ask to be pressed.
 */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-paper-tonal px-2 py-0.5 text-xs font-medium leading-tight text-ink-2',
        className,
      )}
    >
      {children}
    </span>
  );
}
