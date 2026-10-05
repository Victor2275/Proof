import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
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
  /** Reaches the input itself, for a sheet that must focus it on open. */
  ref?: Ref<HTMLInputElement>;
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
          error ? 'border-fault' : 'border-rule',
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
              error ? 'text-fault' : 'group-focus-within:text-signal',
            )}
          >
            {unit}
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          id={messageId}
          className={cn('text-xs', error ? 'text-fault' : 'text-ink-muted')}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

/*
 * A panel textarea.
 *
 * Same outline, same focus behaviour and same error wiring as Field — a
 * multi-line value is still a value, and should not look like a different
 * system because it wraps. Sized by rows rather than a fixed height so a step
 * and a note can ask for the room they need.
 */

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  /** Sets the text in the instruction voice rather than mono, for prose. */
  prose?: boolean;
  className?: string;
}

export function TextArea({
  label,
  error,
  hint,
  hideLabel = false,
  prose = false,
  className,
  id,
  rows = 4,
  ...props
}: TextAreaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className={cn('label-silkscreen', hideLabel && 'sr-only')}>
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'w-full resize-y rounded-control border bg-panel-sunk p-3 text-ink placeholder:text-ink-muted',
          'focus:border-signal focus:outline-none',
          prose && 'font-prose',
          error ? 'border-fault' : 'border-rule',
        )}
        {...props}
      />
      {message ? (
        <p id={messageId} className={cn('text-xs', error ? 'text-fault' : 'text-ink-muted')}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

/*
 * A panel select.
 *
 * The native control, because its open list is drawn by the platform and is
 * the one every screen reader and every thumb already knows. Only the closed
 * state is ours: the browser's own arrow is replaced with a silkscreened one
 * so the control reads as part of the faceplate rather than as a visitor.
 */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

export function Select({
  label,
  hint,
  hideLabel = false,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className={cn('label-silkscreen', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          className={cn(
            'h-11 w-full appearance-none rounded-control border border-rule bg-panel-sunk pl-3 pr-9',
            'text-ink focus:border-signal focus:outline-none',
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </div>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
