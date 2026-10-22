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
 * A text input.
 *
 * A raised paper well with a hairline; the edge turns ink on focus and the
 * focus ring does the rest. Units are printed inside the field rather than
 * floating beside it, so a weight reads as one object.
 *
 * Errors name the problem and the recovery, in the caution colour, and are
 * wired to the input with aria-describedby rather than left as text nearby.
 */

const WELL =
  'rounded-control border bg-paper-raised text-ink transition-colors placeholder:text-ink-muted';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  /** Reaches the input itself, for a sheet that must focus it on open. */
  ref?: Ref<HTMLInputElement>;
  /** Unit printed at the right edge of the field, e.g. "g", "°F". */
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
      <label htmlFor={fieldId} className={cn('ui-label text-ink-2', hideLabel && 'sr-only')}>
        {label}
      </label>

      <div
        className={cn(
          WELL,
          'group flex items-center gap-2 px-3 focus-within:border-ink',
          error ? 'border-fault' : 'border-rule-strong',
        )}
      >
        {leading ? <span className="shrink-0 text-ink-muted">{leading}</span> : null}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none"
          {...props}
        />
        {unit ? (
          <span className={cn('shrink-0 text-sm', error ? 'text-fault' : 'text-ink-muted')}>{unit}</span>
        ) : null}
      </div>

      {message ? (
        <p id={messageId} className={cn('text-sm', error ? 'text-fault' : 'text-ink-muted')}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

/*
 * A textarea.
 *
 * Same well, same focus behaviour and same error wiring as Field — a
 * multi-line value is still a value. Sized by rows so a step and a note can
 * ask for the room they need; `prose` sets it in the reading serif.
 */

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  /** Sets the text in the reading serif rather than the UI face, for prose. */
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
      <label htmlFor={fieldId} className={cn('ui-label text-ink-2', hideLabel && 'sr-only')}>
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          WELL,
          'w-full resize-y p-3 focus:border-ink focus:outline-none',
          prose && 'font-prose text-[1.0625rem]',
          error ? 'border-fault' : 'border-rule-strong',
        )}
        {...props}
      />
      {message ? (
        <p id={messageId} className={cn('text-sm', error ? 'text-fault' : 'text-ink-muted')}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

/*
 * A select.
 *
 * The native control, because its open list is drawn by the platform and is
 * the one every screen reader and every thumb already knows. Only the closed
 * state is ours.
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
      <label htmlFor={fieldId} className={cn('ui-label text-ink-2', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          className={cn(WELL, 'h-11 w-full appearance-none border-rule-strong pl-3 pr-9 focus:border-ink focus:outline-none')}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </div>
      {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}
