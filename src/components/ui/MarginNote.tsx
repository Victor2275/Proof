import type { ReactNode } from 'react';
import { PencilLine } from 'lucide-react';
import { cn } from '../../lib/cn';

/*
 * A note in the margin: what a past bake said about this recipe or this step,
 * pencilled beside the print. Pencil is its colour and nothing else's, and it
 * is set in the reading face's italic so it reads as handwriting next to type
 * without pretending to be handwriting — unless Settings → Handwritten notes
 * is on, when `.hand` sets it in Caveat (change 18).
 */
export interface MarginNoteProps {
  /** A short lead: "Oct 17", "Next time". */
  lead?: string;
  children: ReactNode;
  className?: string;
}

export function MarginNote({ lead, children, className }: MarginNoteProps) {
  return (
    <p className={cn('font-prose flex gap-1.5 text-[0.9375rem] italic leading-snug text-pencil', className)}>
      <PencilLine className="mt-[3px] h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0">
        {lead ? <span className="not-italic font-sans text-[0.8125rem] font-semibold">{lead}: </span> : null}
        <span className="hand">{children}</span>
      </span>
    </p>
  );
}
