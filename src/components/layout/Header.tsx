import { Moon, Sun, LogOut } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { revokeAccessToken } from '@/services/google-auth';

export function Header() {
  const { user, darkMode, toggleDarkMode, setUser } = useAppStore();

  const handleLogout = () => {
    if (user?.accessToken) {
      revokeAccessToken(user.accessToken);
    }
    setUser(null);
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 md:hidden">
          <span className="text-xl">🌿</span>
          <span className="font-bold text-garden-700 dark:text-garden-400">
            菜園日記
          </span>
        </div>
        <div className="hidden md:block" />

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="テーマ切り替え"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <div className="flex items-center gap-2">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full"
                />
              )}
              <span className="text-sm hidden sm:inline">{user.name}</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                aria-label="ログアウト"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
