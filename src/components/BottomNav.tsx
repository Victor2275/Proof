import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, Plus, Notebook, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Cookbook" },
    { to: "/gallery", icon: ImageIcon, label: "Gallery" },
    { to: "/new", icon: Plus, label: "New Recipe" },
    { to: "/notes", icon: Notebook, label: "Notes" },
    { to: "/settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-paper border-t border-border-subtle z-50 px-4 py-2 flex items-center justify-between pb-safe">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
        const Icon = item.icon;
        
        return (
          <NavLink 
            key={item.to} 
            to={item.to}
            className="relative flex flex-col items-center justify-center w-16 h-12"
          >
            {isActive && (
              <motion.div 
                layoutId="bottomNavIndicator"
                className="absolute inset-0 bg-border-subtle rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-ink' : 'text-ink-muted'}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] mt-1 relative z-10 font-medium transition-colors ${isActive ? 'text-ink' : 'text-ink-muted'}`}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}
