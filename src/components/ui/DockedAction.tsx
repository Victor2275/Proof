import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '../../lib/cn';

/*
 * The main action, kept under the thumb.
 *
 * A recipe's Start cooking sits under its title. Read down into the
 * ingredients and it scrolls away; this bar slides up above the tab bar the
 * moment it does, and goes again when the original is back in view, so there
 * is never a second copy on screen. A phone surface only: a desktop has room
 * for the original to stay in sight.
 */
export interface DockedActionProps {
  /** The in-page control this bar stands in for. */
  watch: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}

export function DockedAction({ watch, children, className }: DockedActionProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = watch.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      // Only once it has gone up off the screen, not before it has come into view.
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <div
      inert={!shown}
      aria-hidden={!shown || undefined}
      className={cn(
        'above-nav fixed inset-x-0 z-20 flex items-center gap-3 border-t border-rule bg-paper px-3 py-2 md:hidden',
        'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
