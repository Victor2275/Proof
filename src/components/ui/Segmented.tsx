import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { haptic } from '../../lib/haptics';

/*
 * A segmented control: two to four views of the same thing, one chosen.
 * Chapters | A–Z, Journal | By recipe, Light | Dark | System.
 *
 * A radio group to assistive technology, because that is what it is: exactly
 * one option is checked, Tab reaches the group once, and the arrow keys move
 * the choice — the platform's own convention, not a row of toggles. The chosen
 * segment rises on a paper thumb inside a tonal track.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedProps<T extends string> {
  /** Names the group, e.g. "Contents view". */
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  /** Stretches the track to the container, segments sharing the width. */
  block?: boolean;
  className?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  block = false,
  className,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const choose = (next: T) => {
    if (next === value) return;
    haptic('selection');
    onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const nextIndex = (index + step + options.length) % options.length;
    choose(options[nextIndex].value);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex gap-0.5 rounded-full bg-paper-tonal p-[3px] font-sans text-sm',
        block && 'flex w-full',
        className,
      )}
    >
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => choose(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'pressable inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full px-3.5',
              'transition-[background-color,color,box-shadow] duration-150',
              block && 'flex-1',
              checked
                ? 'bg-paper-raised font-semibold text-ink shadow-[var(--lift)]'
                : 'font-normal text-ink-2 hover:text-ink',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
