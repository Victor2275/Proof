import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/*
 * Panel buttons.
 *
 * Outlined at rest, filled when engaged — the machine's own logic, where a
 * control lights up because it is doing something rather than to attract a
 * click. `primary` fills with the signal colour and is the screen's one solid
 * red: the thing happening now. Everything else is outlined or quiet.
 *
 * Controls have real travel. The pressed state moves the label down a pixel and
 * pairs with a haptic tick at the call site, so a control looks operable before
 * it is touched — which matters when hands are wet.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'border-signal bg-signal text-white hover:opacity-90 active:opacity-100',
  secondary:
    'border-rule bg-transparent text-ink hover:border-ink-muted active:bg-ink active:text-ground',
  ghost:
    'border-transparent bg-transparent text-ink-muted hover:text-ink hover:border-rule',
  danger:
    'border-spoiled bg-transparent text-signal hover:bg-spoiled hover:text-white',
};

const SIZES: Record<Size, string> = {
  // 44px minimum touch target on anything reachable mid-bake; `sm` is for
  // dense desktop chrome only.
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
};

/**
 * The button's visual classes, exposed for the rare non-<button> element that
 * must look like one — a routed `<Link>` acting as a control (the dashboard's
 * RESUME jumps into Baking Mode, which is navigation, not a click handler).
 * Kept in one place so the Link and the real button can never drift apart.
 */
export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  engaged = false,
  className,
}: {
  variant?: Variant;
  size?: Size;
  engaged?: boolean;
  className?: string;
} = {}) {
  return cn(
    'label-silkscreen inline-flex items-center justify-center gap-2 rounded-control border',
    'transition-[background-color,border-color,color,transform] duration-75',
    'active:translate-y-px',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0',
    SIZES[size],
    VARIANTS[variant],
    engaged && variant === 'secondary' && 'border-ink bg-ink text-ground',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders the engaged state — a toggle that is currently on. */
  engaged?: boolean;
  /** Blocks interaction and names why, for a screen reader as well as visually. */
  busy?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  engaged = false,
  busy = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-pressed={engaged || undefined}
      className={buttonClassName({ variant, size, engaged, className })}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
