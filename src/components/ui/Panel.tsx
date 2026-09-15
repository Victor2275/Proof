import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * A matte panel with a silkscreened head.
 *
 * This replaces the rounded, translucent, glowing "card" of the previous world.
 * It is flat, squared, and bordered by a hairline rule — depth comes from the
 * rule and the ground behind it, never from a shadow.
 *
 * Panels do not nest. If content inside a panel needs separating, it gets a
 * rule, not another panel.
 */

export interface PanelProps {
  /** Silkscreened caption on the head rule. */
  title?: string;
  /** Lights the head LED — reserved for a panel whose subject is running now. */
  lit?: boolean;
  /** Draws the panel in the signal colour: this is the thing happening now. */
  active?: boolean;
  /** Controls ranged at the right of the head. */
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
        'rounded-panel border bg-panel',
        active ? 'border-signal' : 'border-rule',
        className,
      )}
    >
      {title || actions ? (
        <header
          className={cn(
            'flex items-center justify-between gap-3 border-b px-4 py-2.5',
            active ? 'border-signal' : 'border-rule',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* The head LED. Dark is a designed state, not an empty one. */}
            <span
              className={cn('h-2 w-2 shrink-0', lit ? 'bg-signal' : 'bg-key-unlit')}
              aria-hidden="true"
            />
            {title ? <h2 className="label-silkscreen truncate">{title}</h2> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? undefined : 'p-4'}>{children}</div>
    </section>
  );
}

/**
 * A label/value row, as printed down the side of a panel.
 *
 * The label is silkscreened and the value is ranged right, so a stack of these
 * reads as a spec block rather than as sentences.
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
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', className)}>
      <span className="label-silkscreen">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-ink">{value}</span>
    </div>
  );
}
