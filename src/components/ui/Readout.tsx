import { cn } from '../../lib/cn';

/*
 * A figure: a weight, a temperature, a time left, a total.
 *
 * Plain tabular numerals in the UI face, so a value that changes never
 * shifts the line it sits in. The unit is set small beside it and the
 * caption above it. To a screen reader the three are one value — "Total,
 * 1:15 hr" — not three unrelated pieces of text.
 */

const SIZES = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-7xl',
} as const;

export type ReadoutSize = keyof typeof SIZES;

/** Units arrive as words some callers wrote in capitals; a cookbook prints "min". */
function printedUnit(unit: string) {
  return /^[A-Z]+$/.test(unit) ? unit.toLowerCase() : unit;
}

export interface ReadoutProps {
  /** The value as it should read, e.g. "12:40", "78.5", 450. */
  value: string | number;
  /** Unit printed beside the value, e.g. "min", "%", "°F". */
  unit?: string;
  size?: ReadoutSize;
  /** `accent` for a value that is running now (a timer); `ink` otherwise. */
  tone?: 'accent' | 'ink';
  /** Caption above the value. */
  label?: string;
  className?: string;
}

export function Readout({ value, unit, size = 'md', tone = 'ink', label, className }: ReadoutProps) {
  const text = String(value);
  return (
    <div
      className={cn('inline-flex flex-col gap-0.5', className)}
      role="img"
      aria-label={[label, text, unit].filter(Boolean).join(' ')}
    >
      {label ? (
        <span className="ui-label" aria-hidden="true">
          {label}
        </span>
      ) : null}
      <span className="inline-flex items-baseline gap-1" aria-hidden="true">
        <span
          className={cn(
            'font-sans font-semibold leading-none tabular-nums tracking-tight',
            SIZES[size],
            tone === 'accent' ? 'text-accent' : 'text-ink',
          )}
        >
          {text}
        </span>
        {unit ? <span className="text-sm text-ink-muted">{printedUnit(unit)}</span> : null}
      </span>
    </div>
  );
}
