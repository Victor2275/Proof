import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Compass, NotebookPen, ShoppingBasket, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { haptic } from '../lib/haptics';
import { DESTINATIONS, destinationOf, isChromeFree, type Destination } from '../lib/destinations';

/*
 * The phone's four tabs: Cookbook, Bakes, Shop, Discover.
 *
 * Every place in the app is one of these or sits behind the avatar, so there
 * is no More drawer to hide things in, and no floating + covering the page:
 * "New" is a labelled button in the Cookbook's own header. Each tab is a full
 * quarter of the bar, icon over label, well past the 44px floor. The tab of
 * the screen you are on is marked by weight and ink, and by `aria-current`
 * for anyone not looking.
 */
const ICONS: Record<Destination, LucideIcon> = {
  cookbook: BookOpen,
  bakes: NotebookPen,
  shop: ShoppingBasket,
  discover: Compass,
};

export default function TabBar() {
  const { pathname } = useLocation();
  if (isChromeFree(pathname)) return null;
  const current = destinationOf(pathname);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-rule bg-paper pb-safe md:hidden print:hidden"
    >
      {DESTINATIONS.map(({ id, to, label }) => {
        const Icon = ICONS[id];
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
              'pressable flex min-h-[3.625rem] flex-col items-center justify-center gap-0.5 font-sans text-xs',
              active ? 'font-semibold text-ink' : 'text-ink-muted',
            )}
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.7} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
