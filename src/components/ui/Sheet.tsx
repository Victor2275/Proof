import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { haptic } from '../../lib/haptics';

/*
 * A layer that sits over the interface.
 *
 * This is the one place `.scrim` belongs: a sheet, a dialog, a drawer. The dim
 * says the page beneath is still there and is not the thing you are operating.
 *
 * It exists because the same scrim-and-panel was hand-rolled eleven times, and
 * not one copy trapped focus, closed on Escape, restored focus to whatever
 * opened it, or stopped the page behind from scrolling. Those are not
 * embellishments — a modal you cannot leave by keyboard is a trap — so they
 * live here, once.
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

/*
 * Detents: the heights a bottom sheet rests at, as fractions of the screen.
 * Half, so the page it came from is still in view, and nearly full, for a
 * long list or a form. A drag that ends below DISMISS_AT closes the sheet.
 */
const DETENTS = [0.5, 0.92] as const;
export type Detent = 0 | 1;
const DISMISS_AT = 0.3;

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
  /**
   * The control that takes focus on open, when it is not simply the first —
   * the PIN field rather than the close control above it. Not `autoFocus`,
   * which fires before the sheet has recorded who opened it.
   */
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * A bottom sheet that rests at half or nearly full height. The grabber
   * becomes a button that cycles the two, the sheet can be dragged between
   * them or down to close, and the close control reads "Done".
   */
  detents?: boolean;
  /** Which detent a sheet with `detents` opens at. */
  initialDetent?: Detent;
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
  initialFocus,
  detents: hasDetents = false,
  initialDetent = 0,
  children,
  className,
}: SheetProps) {
  const [detent, setDetent] = useState<Detent>(initialDetent);
  // Pixels the sheet has been dragged down (negative: up) from its detent.
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef(0);
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

  // Each opening starts at its first detent, not wherever the last one was left.
  useEffect(() => {
    if (open) setDetent(initialDetent);
  }, [open, initialDetent]);

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
      const wanted = initialFocus?.current;
      if (wanted && isReachable(wanted)) {
        wanted.focus();
        return;
      }
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
    // `initialFocus` is a ref, read once on open; it is not a reason to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /*
   * The drag. Pointer capture keeps the gesture on the grabber however far the
   * finger travels, and nothing here moves focus, so the trap is exactly as it
   * was when the drag began. Every drag has a twin that is not a gesture: the
   * grabber's own press, and Done.
   */
  const onDragStart = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStart.current = e.clientY;
    setDrag(0);
  };
  const onDragMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (drag === null) return;
    setDrag(e.clientY - dragStart.current);
  };
  const onDragEnd = (e: ReactPointerEvent<HTMLElement>) => {
    if (drag === null) return;
    const moved = e.clientY - dragStart.current;
    setDrag(null);
    // A press that barely moved is a press: the click handler cycles instead.
    if (Math.abs(moved) < 8) return;
    const height = window.innerHeight || 1;
    const fraction = DETENTS[detent] - moved / height;
    if (fraction < DISMISS_AT) {
      onClose();
      return;
    }
    const nearest: Detent = Math.abs(fraction - DETENTS[0]) <= Math.abs(fraction - DETENTS[1]) ? 0 : 1;
    if (nearest !== detent) haptic('medium');
    setDetent(nearest);
    suppressClick.current = true;
  };
  // The click that follows a real drag is not a request to cycle.
  const suppressClick = useRef(false);
  const cycleDetent = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    haptic('medium');
    setDetent((d) => (d === 0 ? 1 : 0));
  };

  if (!mounted) return null;

  const isBottom = placement === 'bottom';
  const withDetents = hasDetents && isBottom && size !== 'full';
  const detentStyle = withDetents
    ? {
        // Up to the top of the screen and no further.
        height: `calc(${DETENTS[detent] * 100}dvh - ${Math.max(drag ?? 0, -(0.98 - DETENTS[detent]) * window.innerHeight)}px)`,
      }
    : undefined;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: layer }}>
      <div
        className={cn(
          'scrim absolute inset-0 transition-opacity duration-200',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        className={cn(
          'absolute inset-0 flex',
          // A sized bottom sheet rises from the middle of the edge on a wide
          // screen, not from its left corner.
          isBottom ? 'items-end justify-center' : 'items-center justify-center p-4',
        )}
      >
        {/*
         * The sheet's chrome is drawn here rather than by composing <Panel>,
         * because a sheet needs a fixed head and foot with only its body
         * scrolling, and Panel is a single flow.
         */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title ? undefined : label}
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          style={detentStyle}
          className={cn(
            'flex w-full flex-col bg-paper text-ink focus:outline-none',
            drag === null &&
              'transition-[transform,opacity,height] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
            isBottom
              ? [
                  withDetents ? 'max-h-none' : 'max-h-[85vh]',
                  'rounded-t-sheet pb-safe shadow-[var(--lift-sheet)]',
                  entered ? 'translate-y-0' : 'translate-y-full',
                ]
              : [
                  'max-h-[calc(100vh-2rem)] rounded-sheet border border-rule shadow-[var(--lift-sheet)]',
                  entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
                ],
            SIZES[size],
            size === 'full' && 'h-full max-h-none rounded-none border-0',
            className,
          )}
        >
          {withDetents ? (
            /* The grabber is a real control: a press cycles the detents, a drag
             * moves between them or closes the sheet. */
            <button
              type="button"
              onClick={cycleDetent}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={() => setDrag(null)}
              aria-label={detent === 0 ? 'Expand sheet' : 'Shrink sheet'}
              className="flex h-6 w-full shrink-0 touch-none items-center justify-center rounded-t-sheet"
            >
              <span className="h-[5px] w-9 rounded-full bg-rule-strong" aria-hidden="true" />
            </button>
          ) : isBottom && size !== 'full' ? (
            /* The grabber says the sheet can be pulled down; Close and Escape
             * are the controls that actually do it. */
            <span className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-rule-strong" aria-hidden="true" />
          ) : null}

          {title || actions || dismissible ? (
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-1">
              <div className="min-w-0">
                {title ? (
                  <h2 id={titleId} className="font-title truncate text-xl text-ink">
                    {title}
                  </h2>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {actions}
                {dismissible && withDetents ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="pressable -mr-2 min-h-11 rounded-full px-3.5 font-sans text-[0.9375rem] font-semibold text-ink hover:bg-paper-sunk"
                  >
                    Done
                  </button>
                ) : dismissible ? (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    // The glyph stays small; the target does not. The floor for
                    // anything a thumb has to hit is 44.
                    className="pressable -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-sunk hover:text-ink"
                  >
                    <X className="h-5 w-5" />
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
