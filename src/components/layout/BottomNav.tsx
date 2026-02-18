import { Link, useLocation } from 'react-router-dom';
import { Home, Sprout, PlusCircle, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/utils';

const navItems = [
  { to: '/', icon: Home, label: 'ホーム' },
  { to: '/planters', icon: Sprout, label: 'プランター' },
  { to: '/activities/new', icon: PlusCircle, label: '記録' },
  { to: '/analytics', icon: BarChart3, label: '分析' },
  { to: '/settings', icon: Settings, label: '設定' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full text-xs gap-0.5',
                isActive
                  ? 'text-garden-600 dark:text-garden-400'
                  : 'text-gray-500 dark:text-gray-400',
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
