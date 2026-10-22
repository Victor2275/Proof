import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * A section of a page.
 *
 * Paper on paper: a raised sheet with a hairline and soft corners, its title
 * set as a heading rather than printed on a header bar. Most of a screen
 * should not need one — a heading and whitespace divide a page well enough —
 * so a panel is for a group that genuinely belongs together: an account, a
 * set of totals, a form.
 *
 * Panels do not nest. If content inside a panel needs separating, it gets a
 * rule, not another panel.
 */

export interface PanelProps {
  /** The section's heading. */
  title?: string;
  /** Marks a panel whose subject is running now with a small accent dot. */
  lit?: boolean;
  /** Edges the panel in the accent: this is the thing happening now. */
  active?: boolean;
  /** Controls ranged at the right of the heading. */
  actions?: ReactNode;
  /** Removes the body padding, for a panel whose child manages its own edges. */
  flush?: boolean;
  children?: ReactNode;
  className?: string;
}

export function Panel({
  title,
  lit = false,
  active = false,
  actions,
  flush = false,
  children,
  className,
}: PanelProps) {
  return (
    <section
      className={cn(
        'rounded-panel border bg-paper-raised',
        active ? 'border-accent' : 'border-rule',
        className,
      )}
    >
      {title || actions ? (
        <header className={cn('flex min-h-12 items-center justify-between gap-3 px-4', flush ? 'pt-3 pb-2' : 'pt-4')}>
          <div className="flex min-w-0 items-center gap-2">
            {lit ? <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" /> : null}
            {title ? <h2 className="font-title truncate text-lg text-ink">{title}</h2> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? undefined : cn('px-4 pb-4', title || actions ? 'pt-1' : 'pt-4')}>{children}</div>
    </section>
  );
}

/**
 * A label and its value on one line, the value ranged right — a totals block,
 * an account's details.
 */
export function PanelRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0', className)}>
      <span className="text-sm text-ink-2">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
