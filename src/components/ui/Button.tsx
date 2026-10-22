import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

/*
 * Buttons.
 *
 * `primary` is filled paprika and is the screen's one main action: Start
 * cooking, Save. `secondary` is outlined in ink, `tonal` sits on a paper-tonal
 * fill for a strong second action that should not compete with the primary
 * (Add missing to Shop), `ghost` is a quiet text control. `danger` is outlined
 * in the spoiled rule and never filled, so a destructive control can never be
 * mistaken for the primary one.
 *
 * Every button answers the press the same way (`.pressable`): it sinks a
 * little and tints, on pointer-down. Labels are sentence case.
 */

type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  /*
   * `--on-accent` flips with the theme because the paprika does not: white on
   * the light theme's deep paprika, charcoal on the dark theme's brighter one.
   */
  primary: 'border-accent bg-accent text-on-accent hover:brightness-95 active:brightness-90',
  secondary:
    'border-rule-strong bg-transparent text-ink hover:bg-paper-sunk active:bg-paper-tonal',
  tonal: 'border-transparent bg-paper-tonal text-ink hover:brightness-[0.98] active:brightness-95',
  ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-paper-sunk hover:text-ink active:bg-paper-tonal',
  danger: 'border-spoiled bg-transparent text-ink hover:bg-paper-sunk active:bg-paper-tonal',
};

const SIZES: Record<Size, string> = {
  // 44px minimum touch target on anything reachable mid-bake; `sm` is for
  // dense desktop chrome and inline affordances only.
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[0.9375rem]',
  lg: 'h-13 px-6 text-base',
};

/**
 * The button's visual classes, exposed for the rare non-<button> element that
 * must look like one — a routed `<Link>` acting as a control. Kept in one place
 * so the Link and the real button can never drift apart.
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
    'pressable inline-flex items-center justify-center gap-2 rounded-control border font-sans font-semibold',
    // Buttons ranged edge to edge in a bank paint over each other's focus
    // ring; lifting the focused one keeps its whole ring visible.
    'relative focus-visible:z-10',
    'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:opacity-45',
    SIZES[size],
    VARIANTS[variant],
    // A latched toggle reads as pressed in: the tonal fill and an ink rule.
    engaged && variant !== 'primary' && 'border-ink bg-paper-tonal text-ink',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /**
   * Toggle state. Passing it at all declares the control a toggle, so it is
   * left undefined by default: `aria-pressed="false"` on every ordinary button
   * would announce the whole app as a panel of switches. Only a control that
   * actually latches passes this.
   */
  engaged?: boolean;
  /** Blocks interaction and names why, for a screen reader as well as visually. */
  busy?: boolean;
  icon?: ReactNode;
  /** Reaches the button itself, for a menu that returns focus to its trigger. */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  engaged,
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
      aria-pressed={engaged}
      className={buttonClassName({ variant, size, engaged: engaged ?? false, className })}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
