import { Link, useLocation } from 'react-router-dom';
import { Book, PlusCircle, Lightbulb, Image, Settings as SettingsIcon, BarChart3, Box, ShoppingBag } from 'lucide-react';

export default function Sidebar({ className = "", onAdminRequired }: { className?: string, onAdminRequired?: () => void }) {
  const location = useLocation();

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
    <aside className={`w-64 bg-sidebar h-screen flex flex-col fixed left-0 top-0 border-r border-border-subtle z-20 ${className}`}>
      <div className="p-6 flex items-center gap-3">
        <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
        <span className="font-bold text-xl tracking-tight uppercase">Proof</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${isActive
                  ? 'bg-black/5 dark:bg-white/10 font-medium'
                  : 'text-ink-muted hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <Icon className="w-4 h-4 opacity-70" />
              {item.name}
            </Link>
          );
        })}
        
        <div className="pt-4">
          <a
            href="/new"
            onClick={handleNewRecipe}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-ink-muted hover:bg-black/5 dark:hover:bg-white/5`}
          >
            <PlusCircle className="w-4 h-4 opacity-70" />
            New Recipe
          </a>
        </div>
      </nav>
    </aside>
  );
}
