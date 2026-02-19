import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { loadGapiClient, loadGisClient, verifyAccessToken, setGapiAccessToken, refreshAccessToken } from '@/services/google-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { PlanterList } from '@/pages/PlanterList';
import { PlanterDetail } from '@/pages/PlanterDetail';
import { ActivityForm } from '@/pages/ActivityForm';
import { Calendar } from '@/pages/Calendar';
import { Weather } from '@/pages/Weather';
import { SoilSensor } from '@/pages/SoilSensor';
import { Analytics } from '@/pages/Analytics';
import { Review } from '@/pages/Review';
import { PhotoGallery } from '@/pages/PhotoGallery';
import { Settings } from '@/pages/Settings';

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
        <Route index element={<Dashboard />} />
        <Route path="planters" element={<PlanterList />} />
        <Route path="planters/:id" element={<PlanterDetail />} />
        <Route path="activities/new" element={<ActivityForm />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="weather" element={<Weather />} />
        <Route path="soil-sensor" element={<SoilSensor />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="review" element={<Review />} />
        <Route path="photos" element={<PhotoGallery />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
