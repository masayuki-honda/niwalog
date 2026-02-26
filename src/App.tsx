import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { loadGapiClient, loadGisClient, verifyAccessToken, setGapiAccessToken, refreshAccessToken } from '@/services/google-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const PlanterList = lazy(() => import('@/pages/PlanterList').then(m => ({ default: m.PlanterList })));
const PlanterDetail = lazy(() => import('@/pages/PlanterDetail').then(m => ({ default: m.PlanterDetail })));
const ActivityForm = lazy(() => import('@/pages/ActivityForm').then(m => ({ default: m.ActivityForm })));
const Calendar = lazy(() => import('@/pages/Calendar').then(m => ({ default: m.Calendar })));
const Weather = lazy(() => import('@/pages/Weather').then(m => ({ default: m.Weather })));
const SoilSensor = lazy(() => import('@/pages/SoilSensor').then(m => ({ default: m.SoilSensor })));
const Analytics = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const Review = lazy(() => import('@/pages/Review').then(m => ({ default: m.Review })));
const PhotoGallery = lazy(() => import('@/pages/PhotoGallery').then(m => ({ default: m.PhotoGallery })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-garden-200 border-t-garden-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const isInitializing = useAppStore((s) => s.isInitializing);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-garden-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <span className="text-5xl">🌿</span>
          <p className="mt-4 text-garden-700 dark:text-garden-400 animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/**
 * アプリ起動時に永続化されたユーザー情報があれば、
 * Google APIを再初期化してアクセストークンを静かに再取得する。
 */
function useRestoreSession() {
  const user = useAppStore((s) => s.user);
  const googleClientId = useAppStore((s) => s.googleClientId);
  const setUser = useAppStore((s) => s.setUser);
  const setIsInitializing = useAppStore((s) => s.setIsInitializing);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      // 永続化されたユーザー情報と accessToken がなければスキップ
      if (!user || !user.accessToken || !googleClientId) {
        setIsInitializing(false);
        return;
      }

      try {
        // GAPI クライアントと GIS を初期化（トークンリフレッシュに必要）
        await loadGapiClient();
        await loadGisClient(googleClientId);

        // 保存済みトークンが有効か検証（ポップアップなし）
        const isValid = await verifyAccessToken(user.accessToken);

        if (isValid) {
          // トークン有効 → そのままセット
          setGapiAccessToken(user.accessToken);
        } else {
          // トークン期限切れ → サイレントリフレッシュを試行
          try {
            const newToken = await refreshAccessToken();
            setGapiAccessToken(newToken);
            if (!cancelled) setUser({ ...user, accessToken: newToken });
          } catch {
            // リフレッシュ失敗 → ログアウト状態に戻す
            if (!cancelled) setUser(null);
          }
        }
      } catch {
        // 初期化に失敗 → ログアウト状態に戻す
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    restore();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function App() {
  useRestoreSession();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<PageLoading />}><Dashboard /></Suspense>} />
        <Route path="planters" element={<Suspense fallback={<PageLoading />}><PlanterList /></Suspense>} />
        <Route path="planters/:id" element={<Suspense fallback={<PageLoading />}><PlanterDetail /></Suspense>} />
        <Route path="activities/new" element={<Suspense fallback={<PageLoading />}><ActivityForm /></Suspense>} />
        <Route path="calendar" element={<Suspense fallback={<PageLoading />}><Calendar /></Suspense>} />
        <Route path="weather" element={<Suspense fallback={<PageLoading />}><Weather /></Suspense>} />
        <Route path="soil-sensor" element={<Suspense fallback={<PageLoading />}><SoilSensor /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<PageLoading />}><Analytics /></Suspense>} />
        <Route path="review" element={<Suspense fallback={<PageLoading />}><Review /></Suspense>} />
        <Route path="photos" element={<Suspense fallback={<PageLoading />}><PhotoGallery /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoading />}><Settings /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
