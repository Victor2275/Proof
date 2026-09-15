import { cn } from '../../lib/cn';

/*
 * The output meter.
 *
 * A row of discrete cells that fill left to right, climbing red at the top of
 * the scale exactly as a level meter does. Discrete rather than continuous
 * because a machine's meter counts in cells, and because a countable row is
 * easier to read at a glance across a counter than a smooth bar.
 *
 * Used for hydration, bake counts, and the analytics rows.
 */

export interface MeterProps {
  /** Current value. */
  value: number;
  /** Top of the scale. */
  max: number;
  /** Cells in the row. More cells read as finer instrumentation. */
  cells?: number;
  /**
   * Fraction of the scale above which cells climb into warning colour. Defaults
   * to 1 — no hot end — because most values Proof meters (hydration, bake
   * counts) are not dangerous at the top of their range, and a meter that runs
   * warm by default spends the signal colour on nothing.
   */
  hotAt?: number;
  label?: string;
  /** Printed at the right of the label rule. */
  readout?: string;
  className?: string;
}

export function Meter({
  value,
  max,
  cells = 16,
  hotAt = 1,
  label,
  readout,
  className,
}: MeterProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(Math.max(value / safeMax, 0), 1);
  const filled = Math.round(ratio * cells);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label || readout ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? <span className="label-silkscreen">{label}</span> : null}
          {readout ? <span className="label-silkscreen text-ink">{readout}</span> : null}
        </div>
      ) : null}
      <div
        className="flex h-3 w-full gap-px"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        {Array.from({ length: cells }).map((_, i) => {
          const position = (i + 1) / cells;
          const isFilled = i < filled;
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-key',
                // Filled cells are neutral until they enter the hot zone, so a
                // meter reads as a level first and a warning only when it is one.
                !isFilled
                  ? 'bg-key-unlit'
                  : position > hotAt
                    ? 'bg-key-now'
                    : position > hotAt - 0.15
                      ? 'bg-key-due'
                      : 'bg-key-done',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
