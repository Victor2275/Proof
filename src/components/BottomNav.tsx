import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, Box, MoreHorizontal, Plus, BarChart3, ShoppingBag, Lightbulb, Settings as SettingsIcon, X } from 'lucide-react';
import { cn } from '../lib/cn';

/*
 * Four fixed slots plus a More sheet, not the previous five-icon dock.
 *
 * The old dock had no room for Pantry, Grocery List, or Analytics — three
 * sections with zero mobile entry point. Cookbook, Gallery, and Pantry are the
 * three most reached for while actually cooking; everything else (Analytics,
 * Grocery List, General Notes, Settings — the planning-at-a-desk tasks) moves
 * into More. New Recipe becomes a floating action button instead of competing
 * for a dock slot: starting a recipe is a distinct action, not a destination.
 */

const DOCK_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Cookbook' },
  { to: '/gallery', icon: ImageIcon, label: 'Gallery' },
  { to: '/pantry', icon: Box, label: 'Pantry' },
] as const;

const MORE_ITEMS = [
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/grocery', icon: ShoppingBag, label: 'Grocery List' },
  { to: '/notes', icon: Lightbulb, label: 'General Notes' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Baking Mode is a distraction-free fullscreen surface — the nav would cover its
  // controls and defeat the point, so stay out of the way there.
  if (/^\/recipe\/[^/]+\/bake$/.test(location.pathname)) return null;

  const isMoreActive = MORE_ITEMS.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  return (
    <div className="md:hidden">
      {/* Backdrop + sheet. Plain CSS transitions rather than framer-motion: they
        * cost nothing extra (this component is already in the eager bundle) and
        * the global prefers-reduced-motion rule in index.css collapses them for
        * free, which a JS-driven animation would not get automatically. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          moreOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMoreOpen(false)}
        aria-hidden={!moreOpen}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More sections"
        // The sheet stays mounted while closed so the slide-down has
        // something to animate — but `inert` (not just aria-hidden, which
        // does not by itself stop keyboard focus in every browser) is what
        // actually keeps its links out of the tab order and off-screen-reader
        // when it's sitting below the viewport. React 19 supports it as a
        // native boolean prop.
        inert={!moreOpen}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 rounded-t-panel border-t border-x border-rule bg-panel pb-safe',
          'transition-transform duration-200 ease-out',
          moreOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <span className="label-silkscreen">More</span>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            className="rounded-control p-1 text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid grid-cols-2 gap-1 p-4">
          {MORE_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-control px-3 py-4 text-center',
                  isActive ? 'bg-panel-sunk text-ink' : 'text-ink-muted hover:bg-panel-sunk hover:text-ink',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="label-silkscreen">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Floating action button. Starting a recipe is an action, not a place
        * to navigate to, so it sits apart from the dock rather than in it. */}
      <Link
        to="/new"
        aria-label="New Recipe"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-control border border-signal bg-signal text-white active:translate-y-px"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-rule bg-panel px-2 pb-safe"
        aria-label="Primary"
      >
        {DOCK_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex h-16 w-16 flex-col items-center justify-center gap-1"
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-ink' : 'text-ink-muted')} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn('label-silkscreen', isActive ? 'text-ink' : 'text-ink-muted')}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex h-16 w-16 flex-col items-center justify-center gap-1"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className={cn('h-5 w-5', isMoreActive ? 'text-ink' : 'text-ink-muted')} strokeWidth={isMoreActive ? 2.5 : 2} />
          <span className={cn('label-silkscreen', isMoreActive ? 'text-ink' : 'text-ink-muted')}>More</span>
        </button>
      </nav>
    </div>
  );
}
