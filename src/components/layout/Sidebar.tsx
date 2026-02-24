import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Sprout,
  PlusCircle,
  BarChart3,
  Settings,
  Calendar,
  Cloud,
  Camera,
  ClipboardList,
  Radar,
} from 'lucide-react';
import { cn } from '@/utils';

const navGroups = [
  {
    label: 'メイン',
    items: [
      { to: '/', icon: Home, label: 'ダッシュボード' },
      { to: '/planters', icon: Sprout, label: 'プランター' },
      { to: '/activities/new', icon: PlusCircle, label: '作業記録' },
    ],
  },
  {
    label: 'データ',
    items: [
      { to: '/calendar', icon: Calendar, label: 'カレンダー' },
      { to: '/weather', icon: Cloud, label: '気象データ' },
      { to: '/soil-sensor', icon: Radar, label: '土壌センサー' },
      { to: '/photos', icon: Camera, label: '写真' },
    ],
  },
  {
    label: '分析',
    items: [
      { to: '/analytics', icon: BarChart3, label: '分析・相関' },
      { to: '/review', icon: ClipboardList, label: '振り返り' },
    ],
  },
  {
    label: '',
    items: [{ to: '/settings', icon: Settings, label: '設定' }],
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg text-garden-700 dark:text-garden-400">
            菜園日記
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {navGroups.map((group, gi) => (
          <div key={gi} className="mb-2">
            {group.label && (
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            {group.items.map(({ to, icon: Icon, label }) => {
              const isActive =
                to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                    isActive
                      ? 'bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  )}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
