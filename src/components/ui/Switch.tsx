import { useId } from 'react';
import { cn } from '../../lib/cn';
import { haptic } from '../../lib/haptics';

/*
 * A setting that is on or off (change 131): the platform's own switch, the one
 * every thumb and screen reader already knows, rather than a latching key.
 *
 * The whole row is the target — the words and the switch — so it is never a
 * 28px track to aim at. `role="switch"` with `aria-checked` announces it as a
 * switch; the knob's side and the filled track carry the state by shape as
 * well as by tone, so it survives a colour-vision difference.
 */
export interface SwitchProps {
  label: string;
  /** One plain line under the label: what it does. */
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}

export function Switch({ label, description, checked, onChange, className }: SwitchProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={() => {
        haptic('selection');
        onChange(!checked);
      }}
      className={cn('pressable flex min-h-12 w-full items-center justify-between gap-4 py-2.5 text-left', className)}
    >
      <span className="flex min-w-0 flex-col">
        <span id={labelId} className="text-ink">
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className="text-sm text-ink-muted">
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150',
          checked ? 'border-ink bg-ink' : 'border-rule-strong bg-paper-sunk',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-[var(--lift)] transition-[left] duration-150',
            checked ? 'left-[1.5625rem] bg-paper' : 'left-[0.1875rem] bg-ink-muted',
          )}
        />
      </span>
    </button>
  );
}
