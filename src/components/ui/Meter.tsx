import { cn } from '../../lib/cn';

/*
 * A level: hydration, how many recipes have been baked, a share of a total.
 *
 * One rounded track with an ink fill — a measuring line, not a progress bar
 * pretending to be busy. A value past `hotAt` turns the fill paprika, for the
 * rare reading where the top of the scale is worth noticing.
 */

export interface MeterProps {
  /** Current value. */
  value: number;
  /** Top of the scale. */
  max: number;
  /**
   * Fraction of the scale above which the fill turns paprika. Defaults to 1 —
   * no hot end — because most values Proof measures are not dangerous at the
   * top of their range, and a meter that runs warm by default spends the
   * accent on nothing.
   */
  hotAt?: number;
  label?: string;
  /** Printed at the right of the label. */
  readout?: string;
  className?: string;
}

export function Meter({ value, max, hotAt = 1, label, readout, className }: MeterProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(Math.max(value / safeMax, 0), 1);
  // A present-but-tiny value still shows. 3 of 203 recipes is not none, and a
  // meter that reads "3 of 203" beside an empty track reports the wrong thing.
  const shown = value > 0 ? Math.max(ratio, 0.02) : 0;
  const hot = hotAt < 1 && ratio > hotAt;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label || readout ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? <span className="text-sm text-ink-2">{label}</span> : null}
          {readout ? <span className="text-sm font-semibold text-ink">{readout}</span> : null}
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-paper-tonal"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', hot ? 'bg-accent' : 'bg-ink-2')}
          style={{ width: `${shown * 100}%` }}
        />
      </div>
    </div>
  );
}
