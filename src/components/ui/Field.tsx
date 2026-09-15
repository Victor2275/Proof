import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * A panel text input.
 *
 * Outlined at rest; the rule and the unit both turn signal on focus, the way a
 * value being edited lights on a machine. Units are printed inside the field
 * rather than floating beside it, so a weight reads as one object.
 *
 * Errors name the problem and the recovery, and are wired to the input with
 * aria-describedby rather than left as red text nearby.
 */

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  /** Silkscreened unit printed at the right edge of the field, e.g. "G", "°F". */
  unit?: string;
  /** Names the problem and the recovery. Presence switches the field to error. */
  error?: string;
  /** Quiet guidance shown when there is no error. */
  hint?: string;
  /** Hides the label visually; it stays available to screen readers. */
  hideLabel?: boolean;
  leading?: ReactNode;
  className?: string;
}

export function Field({
  label,
  unit,
  error,
  hint,
  hideLabel = false,
  leading,
  className,
  id,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className={cn('label-silkscreen', hideLabel && 'sr-only')}>
        {label}
      </label>

      <div
        className={cn(
          'group flex items-center gap-2 rounded-control border bg-panel-sunk px-3',
          'focus-within:border-signal',
          error ? 'border-signal' : 'border-rule',
        )}
      >
        {leading ? <span className="shrink-0 text-ink-muted">{leading}</span> : null}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'h-11 min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted',
            'focus:outline-none',
          )}
          {...props}
        />
        {unit ? (
          <span
            className={cn(
              'label-silkscreen shrink-0',
              error ? 'text-signal' : 'group-focus-within:text-signal',
            )}
          >
            {unit}
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          id={messageId}
          className={cn('text-xs', error ? 'text-signal' : 'text-ink-muted')}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
