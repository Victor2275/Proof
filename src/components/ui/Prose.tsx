import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * People's own words: a comment, a bio (decision B1).
 *
 * The chrome around them is the instrument — silkscreen, rules, keys — but
 * what a person wrote is printed matter, set in the prose face on the plain
 * panel, with their line breaks kept and nothing dressed up as a readout.
 */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-prose whitespace-pre-line break-words text-ink leading-relaxed', className)}>{children}</p>;
}
