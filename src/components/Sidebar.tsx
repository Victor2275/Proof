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
    <aside className={cn('w-64 bg-panel h-screen flex flex-col fixed left-0 top-0 border-r border-rule z-20', className)}>
      <div className="p-6">
        <span className="font-faceplate text-xl text-ink">Proof</span>
      </div>

      {/* The chase light, visible from anywhere in the app — not only on the
        * dashboard row it was born on. */}
      {activeBake ? (
        <Link
          to={`/recipe/${activeBake.recipeId}/bake`}
          className="mx-4 mb-2 flex items-center gap-2 rounded-control border border-signal px-3 py-2 hover:bg-panel-sunk"
        >
          <span className="h-2 w-2 shrink-0 bg-signal" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs text-ink">{activeBake.recipeTitle}</span>
          <span className="label-silkscreen shrink-0 text-signal">Resume</span>
        </Link>
      ) : null}

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-panel-sunk text-ink font-bold'
                  : 'text-ink-muted hover:bg-panel-sunk hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-4">
          <a
            href="/new"
            onClick={handleNewRecipe}
            className="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-panel-sunk hover:text-ink"
          >
            <PlusCircle className="h-4 w-4 shrink-0 opacity-70" />
            New Recipe
          </a>
        </div>
      </nav>
    </aside>
  );
}
