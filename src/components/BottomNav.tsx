import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, Box, MoreHorizontal, Plus, BarChart3, ShoppingBag, Lightbulb, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { useActiveBake } from '../lib/useActiveBake';
import { Sheet } from './ui';

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
  const activeBake = useActiveBake();
  const plusIsLit = location.pathname === '/' && !activeBake;

  // Baking Mode is a distraction-free fullscreen surface — the nav would cover its
  // controls and defeat the point, so stay out of the way there.
  if (/^\/recipe\/[^/]+\/bake$/.test(location.pathname)) return null;

  const isMoreActive = MORE_ITEMS.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  return (
    <div className="md:hidden">
      {/* The More sheet: a `Sheet`, so it traps focus, closes on Escape and
        * hands focus back to the More key — which the hand-rolled one did not. */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More" placement="bottom">
        <nav className="grid grid-cols-2 gap-1" aria-label="More sections">
          {MORE_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-control px-3 py-4 text-center',
                  isActive ? 'bg-panel-sunk text-ink' : 'text-ink-muted hover:bg-panel-sunk hover:text-ink',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="label-silkscreen">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </Sheet>

      {/* Floating action button. Starting a recipe is an action, not a place
        * to navigate to, so it sits apart from the dock rather than in it.
        *
        * It is lit only where writing a new recipe is the page's main action:
        * the cookbook, with nothing baking. Everywhere else the screen has its
        * own one red control — or a bake running, which owns red outright — so
        * the key stays unlit rather than becoming a second "now". */}
      <Link
        to="/new"
        aria-label="New Recipe"
        className={cn(
          'above-nav fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-control border active:translate-y-px',
          plusIsLit
            ? 'border-signal bg-signal text-on-signal'
            : 'border-rule bg-panel text-ink hover:border-ink',
        )}
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
