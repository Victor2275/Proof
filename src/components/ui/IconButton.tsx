import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

/*
 * A control that is only an icon: favourite, share, more, close.
 *
 * The label is required by the type, not by convention — an icon a screen
 * reader cannot name is a control that does not exist for that person. On a
 * pointer device the same words show as a tooltip. Always a 44px round
 * target, whatever the size of the glyph inside it.
 */
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** What the control does, in words. Also the tooltip. */
  label: string;
  icon: ReactNode;
  /** Declares a toggle (Favourite); left undefined for an ordinary action. */
  pressed?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ label, icon, pressed, className, type = 'button', title, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      className={cn(
        'pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink',
        'hover:bg-paper-sunk active:bg-paper-tonal disabled:opacity-45',
        pressed && 'text-accent',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
