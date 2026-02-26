import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // 1時間ごとに更新チェック
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
      console.log(`SW registered: ${swUrl}`);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-garden-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          新しいバージョンがあります。更新しますか？
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setNeedRefresh(false)}
          >
            あとで
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md bg-garden-600 text-white hover:bg-garden-700 transition-colors"
            onClick={() => updateServiceWorker(true)}
          >
            更新する
          </button>
        </div>
      </div>
    </div>
  );
}
