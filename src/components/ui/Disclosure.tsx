import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

/*
 * A row that opens to show more of the same list: "Show 5 more chapters".
 *
 * A real button with `aria-expanded`, so a screen reader hears that it opens
 * something and whether it has. The body grows over 240 ms by animating the
 * grid row from 0fr to 1fr, which needs no measuring, and the chevron turns
 * over 180 ms. Closed, the body is `inert`: still in the tree so it can
 * animate, but out of the tab order and out of reach of assistive technology.
 */
export interface DisclosureProps {
  /** The row's words while closed. */
  summary: ReactNode;
  /** The row's words while open; the summary is kept when this is left out. */
  openSummary?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled use: pass both, or neither. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Disclosure({
  summary,
  openSummary,
  defaultOpen = false,
  open: controlled,
  onOpenChange,
  children,
  className,
}: DisclosureProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const bodyId = useId();

  const toggle = () => {
    const next = !open;
    if (controlled === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
        className={cn(
          'pressable flex min-h-11 w-full items-center gap-2 rounded-control px-2 -mx-2 text-left',
          'font-sans text-[0.9375rem] font-medium text-ink hover:bg-paper-sunk active:bg-paper-tonal',
        )}
      >
        <span className="min-w-0 flex-1">{open && openSummary ? openSummary : summary}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-5 w-5 shrink-0 text-ink-muted transition-transform duration-[180ms]', open && 'rotate-180')}
        />
      </button>
      <div
        id={bodyId}
        className={cn(
          'grid transition-[grid-template-rows] duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        inert={!open}
        aria-hidden={!open || undefined}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
