import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/test-utils';
import { ToastContainer } from '../Toast';
import { useToastStore } from '../../stores/toast-store';

describe('ToastContainer', () => {
  it('トーストがない場合は何も描画しない', () => {
    useToastStore.setState({ toasts: [] });
    const { container } = renderWithProviders(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('トーストがある場合はメッセージを表示する', () => {
    useToastStore.setState({
      toasts: [
        { id: 'toast-1', type: 'success', message: '保存しました', duration: 3500 },
      ],
    });
    renderWithProviders(<ToastContainer />);
    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('複数のトーストを表示できる', () => {
    useToastStore.setState({
      toasts: [
        { id: 'toast-1', type: 'success', message: '成功メッセージ', duration: 3500 },
        { id: 'toast-2', type: 'error', message: 'エラーメッセージ', duration: 5000 },
      ],
    });
    renderWithProviders(<ToastContainer />);
    expect(screen.getByText('成功メッセージ')).toBeInTheDocument();
    expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
  });
});
