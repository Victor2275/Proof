import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { isMac } from '../lib/platform';
import CommandPalette from './CommandPalette';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/cn';
import { haptic } from '../lib/haptics';
import { DESTINATIONS, destinationOf, isChromeFree } from '../lib/destinations';
import { AccountMenu } from './AccountMenu';
import { NewRecipeButton } from './NewRecipeSheet';
import TimerPill from './TimerPill';

/*
 * The desktop's slim top bar, in place of the sidebar (decided 2026-10-21).
 *
 * The wordmark is a home button. The four destinations are a segmented
 * control drawn as navigation — a `<nav>` of links, the current one marked
 * with `aria-current` — whose paper thumb slides to the one you choose over
 * 240 ms. On the right: a running timer when there is one, New, and the
 * avatar. A bar rather than a rail gives the page its full width back, so a
 * recipe can sit at a book's reading measure.
 */
export default function TopBar() {
  const { pathname } = useLocation();
  const current = destinationOf(pathname);
  const navRef = useRef<HTMLElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  // The thumb appears in place on first paint and slides only after that.
  const [settled, setSettled] = useState(false);
  const [palette, setPalette] = useState(false);

  // ⌘K / Ctrl+K opens the palette from anywhere the app's chrome is shown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !link) {
      setThumb(null);
      return;
    }
    const measure = () => setThumb({ left: link.offsetLeft, width: link.offsetWidth });
    measure();
    // Fonts arriving change the links' widths; follow them.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(link);
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [current]);

  if (isChromeFree(pathname)) return null;

  return (
    <header className="sticky top-0 z-30 hidden border-b border-rule bg-paper px-8 md:block print:hidden">
      {/* The same column as the page beneath, so the wordmark lines up with the page's edge. */}
      <div className="mx-auto flex min-h-16 max-w-[75rem] items-center gap-7">
        <Link
          to="/"
          aria-label="Proof, go to the cookbook"
          className="pressable -ml-2 flex min-h-11 items-center rounded-control px-2 font-title text-[1.625rem] text-ink hover:bg-paper-sunk"
          style={{ fontVariationSettings: "'SOFT' 80" }}
        >
          Proof
        </Link>

        <nav
          ref={navRef}
          aria-label="Main"
          className="relative flex rounded-full bg-paper-tonal p-[3px] font-sans text-sm"
        >
          {thumb ? (
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-[3px] bottom-[3px] rounded-full bg-paper-raised shadow-[var(--lift)]',
                settled && 'transition-[left,width] duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]',
              )}
              style={{ left: thumb.left, width: thumb.width }}
            />
          ) : null}
          {DESTINATIONS.map(({ id, to, label }) => {
            const active = current === id;
            return (
              <Link
                key={id}
                to={to}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (!active) haptic('selection');
                }}
                className={cn(
                  'pressable relative flex min-h-11 items-center rounded-full px-4',
                  active ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <TimerPill />
          <button
            type="button"
            onClick={() => setPalette(true)}
            aria-haspopup="dialog"
            aria-keyshortcuts="Meta+K Control+K"
            className="pressable hidden min-h-11 w-56 items-center gap-2 rounded-full border border-rule bg-paper-raised pl-3 pr-2 text-left text-sm text-ink-muted hover:border-rule-strong lg:flex xl:w-72"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">Search or jump to…</span>
            <kbd className="rounded-key border border-rule px-1.5 font-sans text-xs text-ink-2">{isMac() ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <NewRecipeButton />
          <AccountMenu />
        </div>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </header>
  );
}
