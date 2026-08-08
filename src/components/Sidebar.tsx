import { Link, useLocation } from 'react-router-dom';
import { Book, PlusCircle, Lightbulb, Moon, Sun, Image } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setDarkMode(true);
    }
  };

  const navItems = [
    { name: 'My Cookbook', path: '/', icon: Book },
    { name: 'Gallery', path: '/gallery', icon: Image },
    { name: 'New Recipe', path: '/recipe/new', icon: PlusCircle },
    { name: 'General Notes', path: '/notes', icon: Lightbulb },
  ];

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col fixed left-0 top-0 border-r border-border-subtle z-20">
      <div className="p-6 font-bold text-xl tracking-tight">Culinary Lab</div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/recipe/new' && location.pathname.startsWith('/recipe/new')) || (item.path === '/recipe/new' && location.pathname.includes('/edit'));
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
              {item.name} {isActive && item.name === 'New Recipe' && '(active)'}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-subtle">
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm text-ink-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
