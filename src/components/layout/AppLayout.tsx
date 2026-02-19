import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useAppStore } from '@/stores/app-store';
import { getPlanters, getActivities } from '@/services/sheets-api';
import type { Planter, ActivityLog } from '@/types';

/**
 * アプリ共通のデータ読み込みフック。
 * ログイン済みかつ spreadsheetId があれば、
 * プランターと作業記録をスプレッドシートから取得してストアにセットする。
 */
function useLoadAppData() {
  const user = useAppStore((s) => s.user);
  const spreadsheetId = useAppStore((s) => s.spreadsheetId);
  const setPlanters = useAppStore((s) => s.setPlanters);
  const setActivities = useAppStore((s) => s.setActivities);
  const setError = useAppStore((s) => s.setError);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.accessToken || !spreadsheetId) return;

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [planterRows, activityRows] = await Promise.all([
          getPlanters(spreadsheetId, user!.accessToken),
          getActivities(spreadsheetId, user!.accessToken),
        ]);

        if (cancelled) return;

        const planterList: Planter[] = planterRows.map((row) => ({
          id: row[0],
          name: row[1],
          cropName: row[2],
          cropVariety: row[3] ?? '',
          location: row[4] ?? '',
          startDate: row[5] ?? '',
          endDate: row[6] ?? '',
          status: (row[7] as 'active' | 'archived') ?? 'active',
          imageFolderId: row[8] ?? '',
          memo: row[9] ?? '',
          createdAt: row[10] ?? '',
          updatedAt: row[11] ?? '',
        }));

        const activityList: ActivityLog[] = activityRows
          .map((row) => ({
            id: row[0],
            planterId: row[1],
            userName: row[2] ?? '',
            activityType: (row[3] as ActivityLog['activityType']) ?? 'other',
            activityDate: row[4] ?? '',
            memo: row[5] ?? '',
            quantity: row[6] ? Number(row[6]) : null,
            unit: row[7] ?? '',
            photoFileIds: row[8] ? row[8].split(',').filter(Boolean) : [],
            createdAt: row[9] ?? '',
          }))
          .sort(
            (a, b) =>
              new Date(b.activityDate).getTime() -
              new Date(a.activityDate).getTime(),
          );

        setPlanters(planterList);
        setActivities(activityList);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'データの読み込みに失敗しました',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.accessToken, spreadsheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  return isLoading;
}

export function AppLayout() {
  const { darkMode, error, setError } = useAppStore();
  const plantersEmpty = useAppStore((s) => s.planters.length === 0);
  const isLoadingData = useLoadAppData();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <Header />

            {error && (
              <div className="mx-4 mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <main className="flex-1 p-4 pb-20 md:pb-4 max-w-5xl w-full mx-auto">
              {isLoadingData && plantersEmpty ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 animate-pulse">データを読み込み中...</p>
                </div>
              ) : (
                <Outlet />
              )}
            </main>
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
