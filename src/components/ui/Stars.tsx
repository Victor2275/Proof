import { useRef, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';
import { haptic } from '../../lib/haptics';

/*
 * A rating, one to five, the one place besides the primary action that paprika
 * is spent: a mark of how a bake went.
 *
 * `Stars` prints one; to a screen reader it is a single value, "4 of 5 stars".
 * `StarRating` asks for one: a radio group, so Tab reaches it once and the
 * arrow keys move the choice, each star a 44px target. Pressing the chosen
 * star again clears it — a bake does not have to be rated.
 */
export interface StarsProps {
  value: number | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export function Stars({ value, size = 'sm', className }: StarsProps) {
  if (!value) return null;
  const glyph = size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]';
  return (
    <span role="img" aria-label={`${value} of 5 stars`} className={cn('inline-flex items-center gap-px', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(glyph, n <= value ? 'fill-accent text-accent' : 'text-rule-strong')}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

export interface StarRatingProps {
  value: number | null;
  onChange: (next: number | null) => void;
  /** Names the group: "How did it go?" */
  label: string;
  className?: string;
}

export function StarRating({ value, onChange, label, className }: StarRatingProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const choose = (n: number | null) => {
    haptic('selection');
    onChange(n);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = Math.min(5, Math.max(1, n + step));
    choose(next);
    refs.current[next - 1]?.focus();
  };
  // The group is reached once: on the chosen star, or the first when none is.
  const tabStop = value ?? 1;

  return (
    <div role="radiogroup" aria-label={label} className={cn('flex', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          ref={(el) => {
            refs.current[n - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
          tabIndex={n === tabStop ? 0 : -1}
          onClick={() => choose(value === n ? null : n)}
          onKeyDown={(e) => onKeyDown(e, n)}
          className="pressable flex h-11 w-11 items-center justify-center rounded-full hover:bg-paper-sunk"
        >
          <Star
            aria-hidden="true"
            strokeWidth={1.6}
            className={cn('h-7 w-7', value !== null && n <= value ? 'fill-accent text-accent' : 'text-rule-strong')}
          />
        </button>
      ))}
    </div>
  );
}
