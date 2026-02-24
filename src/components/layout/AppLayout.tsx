import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '@/components/Toast';
import { DashboardSkeleton } from '@/components/Skeleton';
import { useAppStore } from '@/stores/app-store';
import { toast } from '@/stores/toast-store';
import { getPlanters, getActivities } from '@/services/sheets-api';
import { withAuthRetry } from '@/utils/auth-retry';
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
        const [planterRows, activityRows] = await withAuthRetry((token) =>
          Promise.all([
            getPlanters(spreadsheetId, token),
            getActivities(spreadsheetId, token),
          ]),
        );

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
          const msg = err instanceof Error ? err.message : 'データの読み込みに失敗しました';
          setError(msg);
          toast.error(msg);
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
  const { darkMode } = useAppStore();
  const plantersEmpty = useAppStore((s) => s.planters.length === 0);
  const isLoadingData = useLoadAppData();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <Header />

            <main className="flex-1 p-4 pb-20 md:pb-4 max-w-5xl w-full mx-auto">
              {isLoadingData && plantersEmpty ? (
                <DashboardSkeleton />
              ) : (
                <Outlet />
              )}
            </main>
          </div>
        </div>
        <BottomNav />
        <ToastContainer />
      </div>
    </div>
  );
}
