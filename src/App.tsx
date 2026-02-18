import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
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
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
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
