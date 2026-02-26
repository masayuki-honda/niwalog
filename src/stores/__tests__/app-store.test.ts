import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../stores/app-store';
import type { Planter, ActivityLog, AuthUser } from '../../types';

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({
    user: null,
    isInitializing: true,
    googleClientId: '',
    spreadsheetId: '',
    driveFolderId: '',
    planters: [],
    activities: [],
    darkMode: false,
    loading: false,
    error: null,
  });
});

const mockUser: AuthUser = {
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/pic.jpg',
  accessToken: 'mock-token',
};

const mockPlanter: Planter = {
  id: 'p-1',
  name: 'トマト畑',
  cropName: 'トマト',
  cropVariety: '桃太郎',
  location: '裏庭',
  startDate: '2026-03-01',
  endDate: '',
  status: 'active',
  imageFolderId: 'folder-1',
  memo: 'テスト',
  createdAt: '2026-02-26T00:00:00Z',
  updatedAt: '2026-02-26T00:00:00Z',
};

const mockActivity: ActivityLog = {
  id: 'a-1',
  planterId: 'p-1',
  userName: 'Test User',
  activityType: 'watering',
  activityDate: '2026-02-26',
  memo: '朝の水やり',
  quantity: null,
  unit: '',
  photoFileIds: [],
  createdAt: '2026-02-26T00:00:00Z',
};

describe('useAppStore', () => {
  describe('Auth', () => {
    it('初期状態では user が null', () => {
      expect(useAppStore.getState().user).toBeNull();
    });

    it('setUser でユーザーを設定できる', () => {
      useAppStore.getState().setUser(mockUser);
      expect(useAppStore.getState().user).toEqual(mockUser);
    });

    it('setUser(null) でログアウトできる', () => {
      useAppStore.getState().setUser(mockUser);
      useAppStore.getState().setUser(null);
      expect(useAppStore.getState().user).toBeNull();
    });

    it('setIsInitializing で初期化状態を変更できる', () => {
      useAppStore.getState().setIsInitializing(false);
      expect(useAppStore.getState().isInitializing).toBe(false);
    });
  });

  describe('Config', () => {
    it('setGoogleClientId で Client ID を保存できる', () => {
      useAppStore.getState().setGoogleClientId('test-client-id');
      expect(useAppStore.getState().googleClientId).toBe('test-client-id');
    });

    it('setSpreadsheetId でスプレッドシート ID を保存できる', () => {
      useAppStore.getState().setSpreadsheetId('sheet-123');
      expect(useAppStore.getState().spreadsheetId).toBe('sheet-123');
    });

    it('setDriveFolderId でフォルダ ID を保存できる', () => {
      useAppStore.getState().setDriveFolderId('folder-abc');
      expect(useAppStore.getState().driveFolderId).toBe('folder-abc');
    });
  });

  describe('Planters', () => {
    it('setPlanters でプランターリストを設定できる', () => {
      useAppStore.getState().setPlanters([mockPlanter]);
      expect(useAppStore.getState().planters).toHaveLength(1);
      expect(useAppStore.getState().planters[0].name).toBe('トマト畑');
    });

    it('addPlanter でプランターを追加できる', () => {
      useAppStore.getState().addPlanter(mockPlanter);
      expect(useAppStore.getState().planters).toHaveLength(1);

      const planter2 = { ...mockPlanter, id: 'p-2', name: 'キュウリ畑' };
      useAppStore.getState().addPlanter(planter2);
      expect(useAppStore.getState().planters).toHaveLength(2);
    });

    it('updatePlanter でプランターを更新できる', () => {
      useAppStore.getState().setPlanters([mockPlanter]);
      const updated = { ...mockPlanter, name: '大玉トマト畑' };
      useAppStore.getState().updatePlanter(updated);
      expect(useAppStore.getState().planters[0].name).toBe('大玉トマト畑');
    });

    it('updatePlanter で存在しないIDの場合は変更なし', () => {
      useAppStore.getState().setPlanters([mockPlanter]);
      const nonExistent = { ...mockPlanter, id: 'p-999', name: '存在しない' };
      useAppStore.getState().updatePlanter(nonExistent);
      expect(useAppStore.getState().planters[0].name).toBe('トマト畑');
    });
  });

  describe('Activities', () => {
    it('setActivities で作業記録リストを設定できる', () => {
      useAppStore.getState().setActivities([mockActivity]);
      expect(useAppStore.getState().activities).toHaveLength(1);
    });

    it('addActivity で作業記録を先頭に追加できる', () => {
      const activity1 = { ...mockActivity, id: 'a-1' };
      const activity2 = { ...mockActivity, id: 'a-2' };
      useAppStore.getState().addActivity(activity1);
      useAppStore.getState().addActivity(activity2);
      // 新しいものが先頭
      expect(useAppStore.getState().activities[0].id).toBe('a-2');
      expect(useAppStore.getState().activities[1].id).toBe('a-1');
    });

    it('removeActivity で作業記録を削除できる', () => {
      useAppStore.getState().setActivities([
        mockActivity,
        { ...mockActivity, id: 'a-2' },
      ]);
      useAppStore.getState().removeActivity('a-1');
      expect(useAppStore.getState().activities).toHaveLength(1);
      expect(useAppStore.getState().activities[0].id).toBe('a-2');
    });
  });

  describe('UI', () => {
    it('toggleDarkMode でダークモードを切り替える', () => {
      expect(useAppStore.getState().darkMode).toBe(false);
      useAppStore.getState().toggleDarkMode();
      expect(useAppStore.getState().darkMode).toBe(true);
      useAppStore.getState().toggleDarkMode();
      expect(useAppStore.getState().darkMode).toBe(false);
    });

    it('setLoading で読み込み状態を変更できる', () => {
      useAppStore.getState().setLoading(true);
      expect(useAppStore.getState().loading).toBe(true);
    });

    it('setError でエラーメッセージを設定・クリアできる', () => {
      useAppStore.getState().setError('テストエラー');
      expect(useAppStore.getState().error).toBe('テストエラー');
      useAppStore.getState().setError(null);
      expect(useAppStore.getState().error).toBeNull();
    });
  });
});
