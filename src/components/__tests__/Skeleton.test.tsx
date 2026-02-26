import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import {
  DashboardSkeleton,
  ListSkeleton,
  ChartPageSkeleton,
  PageSkeleton,
} from '../Skeleton';

describe('Skeleton コンポーネント', () => {
  it('DashboardSkeleton が描画される', () => {
    const { container } = renderWithProviders(<DashboardSkeleton />);
    // animate-pulse クラスを持つ要素があることを確認
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('ListSkeleton がデフォルト5件で描画される', () => {
    const { container } = renderWithProviders(<ListSkeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(5);
  });

  it('ListSkeleton がカスタム件数で描画される', () => {
    const { container: c3 } = renderWithProviders(<ListSkeleton count={3} />);
    const { container: c8 } = renderWithProviders(<ListSkeleton count={8} />);
    // count を大きくすると要素が増える
    const pulse3 = c3.querySelectorAll('.animate-pulse');
    const pulse8 = c8.querySelectorAll('.animate-pulse');
    expect(pulse8.length).toBeGreaterThan(pulse3.length);
  });

  it('ChartPageSkeleton が描画される', () => {
    const { container } = renderWithProviders(<ChartPageSkeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('PageSkeleton が描画される', () => {
    const { container } = renderWithProviders(<PageSkeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
