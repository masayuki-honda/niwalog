import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToastStore, toast } from '../../stores/toast-store';

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useToastStore', () => {
  it('初期状態では toasts が空', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('addToast でトーストを追加できる', () => {
    useToastStore.getState().addToast('success', 'テスト成功');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('テスト成功');
  });

  it('removeToast でトーストを削除できる', () => {
    useToastStore.getState().addToast('info', 'メッセージ1');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('自動消去される（デフォルト 3500ms）', () => {
    useToastStore.getState().addToast('info', 'テスト');
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(3500);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('複数のトーストを管理できる', () => {
    useToastStore.getState().addToast('success', 'メッセージ1');
    useToastStore.getState().addToast('error', 'メッセージ2');
    useToastStore.getState().addToast('warning', 'メッセージ3');
    expect(useToastStore.getState().toasts).toHaveLength(3);
  });
});

describe('toast ヘルパー', () => {
  it('toast.success で成功トーストを追加', () => {
    toast.success('保存しました');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('保存しました');
  });

  it('toast.error でエラートーストを追加', () => {
    toast.error('失敗しました');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('失敗しました');
  });

  it('toast.info で情報トーストを追加', () => {
    toast.info('お知らせ');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('info');
  });

  it('toast.warning で警告トーストを追加', () => {
    toast.warning('注意');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('warning');
  });
});
