import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

/*
 * A dropdown: a short list of actions hung from the control that opened it.
 *
 * Not a Sheet. A menu does not cover the page or ask for a decision; it is a
 * panel of keys that drops open under its trigger and goes away when anything
 * else is touched. What it shares with a Sheet is the part that was missing
 * from the three hand-rolled copies it replaces in the Recipe Viewer: Escape
 * closes it and hands focus back to the trigger, a click anywhere else closes
 * it, and the arrow keys walk its items.
 *
 * Items are separated by rules, not floated as cards with shadows.
 */

interface TriggerProps {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string;
}

const MenuContext = createContext<(returnFocus?: boolean) => void>(() => {});

export interface MenuProps {
  /** Renders the control that opens the menu; spread the props onto it. */
  trigger: (props: TriggerProps) => ReactNode;
  /** Which edge of the trigger the panel lines up with. */
  align?: 'left' | 'right';
  /** Names the menu for a screen reader. */
  label: string;
  children: ReactNode;
  className?: string;
}

export function Menu({ trigger, align = 'left', label, children, className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Focus the first item on open, so the arrow keys have somewhere to start.
  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open]);

  // A press anywhere outside closes it, without stealing focus from where the
  // press landed.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, close]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      list[(at + 1) % list.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      list[(at - 1 + list.length) % list.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      list[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      list[list.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  return (
    <MenuContext.Provider value={close}>
      <div ref={rootRef} className={cn('relative', className)}>
        {trigger({
          ref: triggerRef,
          onClick: () => setOpen((was) => !was),
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          'aria-controls': menuId,
        })}
        {open ? (
          <div
            ref={listRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onKeyDown}
            className={cn(
              'absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-panel border border-rule bg-panel faceplate',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </MenuContext.Provider>
  );
}

const ITEM =
  'flex min-h-11 w-full items-center gap-2 border-b border-rule px-4 text-left text-sm text-ink last:border-b-0 hover:bg-panel-sunk focus:bg-panel-sunk focus:outline-none';

export interface MenuItemProps {
  /** Runs the action; the menu closes after it. */
  onSelect?: () => void;
  /** Makes the item a route link instead of an action. */
  to?: string;
  children: ReactNode;
}

export function MenuItem({ onSelect, to, children }: MenuItemProps) {
  const close = useContext(MenuContext);
  if (to) {
    return (
      <Link to={to} role="menuitem" tabIndex={-1} className={ITEM} onClick={() => close(false)}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={ITEM}
      onClick={() => {
        close();
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}
