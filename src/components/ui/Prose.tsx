import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * People's own words: a comment, a bio, a note. Set in the reading serif with
 * their line breaks kept.
 */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-prose whitespace-pre-line break-words text-ink', className)}>{children}</p>;
}
