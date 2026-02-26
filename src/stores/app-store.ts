import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Planter, ActivityLog } from '@/types';

interface AppState {
  // Auth
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isInitializing: boolean;
  setIsInitializing: (v: boolean) => void;

  // Config (persisted)
  googleClientId: string;
  setGoogleClientId: (id: string) => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  driveFolderId: string;
  setDriveFolderId: (id: string) => void;

  // Planters
  planters: Planter[];
  setPlanters: (planters: Planter[]) => void;
  addPlanter: (planter: Planter) => void;
  updatePlanter: (planter: Planter) => void;

  // Activities
  activities: ActivityLog[];
  setActivities: (activities: ActivityLog[]) => void;
  addActivity: (activity: ActivityLog) => void;
  removeActivity: (id: string) => void;

  // UI
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),
      isInitializing: true,
      setIsInitializing: (isInitializing) => set({ isInitializing }),

      // Config
      googleClientId: '',
      setGoogleClientId: (googleClientId) => set({ googleClientId }),
      spreadsheetId: '',
      setSpreadsheetId: (spreadsheetId) => set({ spreadsheetId }),
      driveFolderId: '',
      setDriveFolderId: (driveFolderId) => set({ driveFolderId }),

      // Planters
      planters: [],
      setPlanters: (planters) => set({ planters }),
      addPlanter: (planter) =>
        set((state) => ({ planters: [...state.planters, planter] })),
      updatePlanter: (planter) =>
        set((state) => ({
          planters: state.planters.map((p) =>
            p.id === planter.id ? planter : p,
          ),
        })),

      // Activities
      activities: [],
      setActivities: (activities) => set({ activities }),
      addActivity: (activity) =>
        set((state) => ({ activities: [activity, ...state.activities] })),
      removeActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
        })),

      // UI
      darkMode: false,
      setDarkMode: (darkMode) => set({ darkMode }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      loading: false,
      setLoading: (loading) => set({ loading }),
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'niwalog',
      partialize: (state) => ({
        googleClientId: state.googleClientId,
        spreadsheetId: state.spreadsheetId,
        driveFolderId: state.driveFolderId,
        darkMode: state.darkMode,
        user: state.user,
      }),
    },
  ),
);
