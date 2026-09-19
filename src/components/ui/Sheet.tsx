import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

/*
 * A layer that sits over the interface.
 *
 * This is the one place `.scrim` belongs: a modal, a sheet, a drawer. The blur
 * says the panel beneath is still there and is not the thing you are operating.
 *
 * It exists because the same scrim-and-panel was hand-rolled eleven times —
 * four in Baking Mode alone, three more in the Recipe Viewer, the bottom nav's
 * More sheet, the pantry scanner, and the editor's own dialogs. Every copy drew
 * the panel slightly differently, and not one of them trapped focus, closed on
 * Escape, restored focus to whatever opened it, or stopped the page behind from
 * scrolling. Those are not embellishments — a modal you cannot leave by
 * keyboard is a trap — so they live here, once.
 *
 * `placement` is the only real variant. A sheet rises from the bottom edge,
 * which is where a thumb is; a dialog sits in the middle, which is where a
 * decision belongs.
 */

export type SheetPlacement = 'center' | 'bottom';
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<SheetSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-none',
};

/*
 * Scroll is locked by a count rather than a flag, because Baking Mode can open
 * the bake log over the ingredients sheet. Closing the upper one must not hand
 * the page back its scrollbar while the lower one is still up.
 */
let scrollLocks = 0;
let restoreOverflow = '';

function lockScroll() {
  if (scrollLocks === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function releaseScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = restoreOverflow;
  }
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/*
 * Whether a control can actually be reached. Deliberately not `offsetParent`,
 * which is the usual shorthand: it reports null for everything under jsdom, so
 * the trap would pass its tests while cycling through a single control.
 */
function isReachable(el: HTMLElement) {
  if (el.closest('[inert]') || el.closest('[aria-hidden="true"]')) return false;
  const style = getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/*
 * Which sheet owns Escape. Baking Mode can open the bake log over the
 * ingredients sheet, and Escape should close the one on top rather than both
 * at once, so the topmost open sheet is the only one that answers.
 */
const sheetStack: symbol[] = [];

export interface SheetProps {
  open: boolean;
  /** Called by the close control, the scrim, and Escape. */
  onClose: () => void;
  /** Silkscreened caption on the head rule. */
  title?: string;
  /** Names the sheet for a screen reader when there is no visible title. */
  label?: string;
  placement?: SheetPlacement;
  size?: SheetSize;
  /** Controls ranged at the right of the head, left of the close control. */
  actions?: ReactNode;
  /** A fixed foot below the scrolling body — where a decision is ranged. */
  footer?: ReactNode;
  /** Removes the body padding, for a child that manages its own edges. */
  flush?: boolean;
  /**
   * When false, the scrim and Escape do nothing and the close control is not
   * drawn. For a sheet mid-operation that must end in a real decision.
   */
  dismissible?: boolean;
  /**
   * Stacking order. The default clears the app chrome; a sheet opened from
   * inside another sheet passes a higher layer.
   */
  layer?: number;
  children: ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  label,
  placement = 'center',
  size = 'md',
  actions,
  footer,
  flush = false,
  dismissible = true,
  layer = 100,
  children,
  className,
}: SheetProps) {
  // `mounted` keeps the panel in the tree for the length of its exit, so it can
  // slide out rather than vanish. `entered` drives the transition itself and is
  // set a frame later, because a node cannot transition from a state it was
  // never painted in.
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Not a fixed string: two sheets can be open at once — a confirmation over
  // the sheet that raised it — and `aria-labelledby` resolves to the first
  // matching id in the document, so both dialogs would take the lower one's
  // name.
  const titleId = useId();
  const idRef = useRef<symbol>(undefined as unknown as symbol);
  if (idRef.current === undefined) idRef.current = Symbol('sheet');

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }
    setEntered(false);
    const timer = setTimeout(() => setMounted(false), 160);
    return () => clearTimeout(timer);
  }, [open]);

  // Focus moves into the sheet on open and returns to whatever opened it on
  // close — otherwise a keyboard user is dropped back at the top of the page
  // having lost their place.
  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    openerRef.current = document.activeElement as HTMLElement | null;
    sheetStack.push(id);
    lockScroll();

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      const at = sheetStack.lastIndexOf(id);
      if (at !== -1) sheetStack.splice(at, 1);
      releaseScroll();
      openerRef.current?.focus?.();
    };
  }, [open]);

  /*
   * Escape is listened for on the document rather than on the panel. Bound to
   * the panel it only fires while focus is still inside, which is exactly the
   * case where a user is least stuck — the one who clicked the scrim, or landed
   * here from a control that has since unmounted, would have no way out.
   */
  useEffect(() => {
    if (!open || !dismissible) return;
    const id = idRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (sheetStack[sheetStack.length - 1] !== id) return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Tab') return;

      // The trap. Without it, Tab walks out of the sheet and into the page
      // behind it, which is still there and still focusable.
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => isReachable(el) || el === document.activeElement,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [],
  );

  if (!mounted) return null;

  const isBottom = placement === 'bottom';

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: layer }}>
      <div
        className={cn(
          'scrim absolute inset-0 transition-opacity duration-150',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        className={cn(
          'absolute inset-0 flex',
          isBottom ? 'items-end' : 'items-center justify-center p-4',
        )}
      >
        {/*
         * The panel's chrome is drawn here rather than by composing <Panel>,
         * because a sheet needs a fixed head and foot with only its body
         * scrolling, and Panel is a single flow. The classes are kept in step
         * with Panel by hand: same rule, same faceplate, same head.
         */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title ? undefined : label}
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex w-full flex-col border border-rule bg-panel faceplate focus:outline-none',
            'transition-[transform,opacity] duration-150 ease-out',
            isBottom
              ? ['max-h-[85vh] rounded-t-panel border-b-0 pb-safe', entered ? 'translate-y-0' : 'translate-y-full']
              : [
                  'max-h-[calc(100vh-2rem)] rounded-panel',
                  entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
                ],
            SIZES[size],
            size === 'full' && 'h-full max-h-none rounded-none border-0',
            className,
          )}
        >
          {title || actions || dismissible ? (
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 bg-key-unlit" aria-hidden="true" />
                {title ? (
                  <h2 id={titleId} className="label-silkscreen truncate">
                    {title}
                  </h2>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {actions}
                {dismissible ? (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="p-1 text-ink-muted transition-colors hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </header>
          ) : null}

          <div className={cn('min-h-0 flex-1 overflow-y-auto', !flush && 'p-4')}>{children}</div>

          {footer ? (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-rule p-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
