import { Link, useLocation } from 'react-router-dom';
import { Book, PlusCircle, Lightbulb, Image, Settings as SettingsIcon, BarChart3, Box, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/cn';
import { useActiveBake } from '../lib/useActiveBake';

/*
 * The global nav rail. Same sections as before — this is a redesign, not a
 * restructure — but the active state no longer borrows the signal red the
 * reference board uses for its own nav highlight: red is reserved for what is
 * happening now, and a nav item you're merely standing on is not an event.
 * Position is instead a lightness contrast (a pressed panel block), the same
 * "engaged" treatment a latched control gets.
 *
 * Between `md` and `lg` it is a 64px rail of icons. A 256px sidebar on a 768px
 * tablet left the page 416px — the recipe's ingredient column collapsed to a
 * letter per line and the cookbook's search row ran off the side. The rail
 * keeps every section one press away, as the "always visible on desktop" rule
 * asks, and gives the page back two hundred pixels until there is room for
 * the labels. Each item keeps its name for a screen reader and as a tooltip.
 */
export default function Sidebar({ className = "", onAdminRequired }: { className?: string, onAdminRequired?: () => void }) {
  const location = useLocation();
  const activeBake = useActiveBake();

  const handleNewRecipe = (e: React.MouseEvent) => {
    e.preventDefault();
    if (localStorage.getItem('adminToken')) {
      window.location.href = '/new';
    } else {
      onAdminRequired?.();
    }
  };

  const navItems = [
    { name: 'My Cookbook', path: '/', icon: Book },
    { name: 'Gallery', path: '/gallery', icon: Image },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Pantry', path: '/pantry', icon: Box },
    { name: 'Grocery List', path: '/grocery', icon: ShoppingBag },
    { name: 'General Notes', path: '/notes', icon: Lightbulb },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className={cn('w-16 lg:w-64 bg-panel h-screen flex flex-col fixed left-0 top-0 border-r border-rule z-20', className)}>
      <div className="flex h-[4.5rem] items-center justify-center lg:block lg:h-auto lg:p-6">
        <span className="font-faceplate text-xl text-ink" aria-label="Proof">
          <span aria-hidden="true" className="lg:hidden">P</span>
          <span aria-hidden="true" className="hidden lg:inline">Proof</span>
        </span>
      </div>

      {/* The chase light, visible from anywhere in the app — not only on the
        * dashboard row it was born on. */}
      {activeBake ? (
        <Link
          to={`/recipe/${activeBake.recipeId}/bake`}
          title={`Resume ${activeBake.recipeTitle}`}
          className="mx-2 mb-2 flex h-11 items-center justify-center gap-2 rounded-control border border-rule hover:bg-panel-sunk lg:mx-4 lg:h-auto lg:justify-start lg:px-3 lg:py-2"
        >
          <span className="h-2 w-2 shrink-0 bg-signal" aria-hidden="true" />
          <span className="sr-only lg:not-sr-only lg:min-w-0 lg:flex-1 lg:truncate lg:text-xs lg:text-ink">{activeBake.recipeTitle}</span>
          <span className="label-silkscreen sr-only shrink-0 text-ink-muted lg:not-sr-only">Resume</span>
        </Link>
      ) : null}

      <nav className="flex-1 px-2 space-y-1 lg:px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              title={item.name}
              className={cn(
                'flex h-11 items-center justify-center gap-3 rounded-control text-sm transition-colors lg:h-auto lg:justify-start lg:px-3 lg:py-2.5',
                isActive
                  ? 'bg-panel-sunk text-ink font-bold'
                  : 'text-ink-muted hover:bg-panel-sunk hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only lg:not-sr-only">{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-4">
          <a
            href="/new"
            onClick={handleNewRecipe}
            title="New Recipe"
            className="flex h-11 items-center justify-center gap-3 rounded-control text-sm text-ink-muted transition-colors hover:bg-panel-sunk hover:text-ink lg:h-auto lg:justify-start lg:px-3 lg:py-2.5"
          >
            <PlusCircle className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
            <span className="sr-only lg:not-sr-only">New Recipe</span>
          </a>
        </div>
      </nav>
    </aside>
  );
}
