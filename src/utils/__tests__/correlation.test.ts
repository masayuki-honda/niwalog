import { describe, it, expect } from 'vitest';
import {
  pearsonCorrelation,
  correlationLabel,
  correlationColor,
  calculateGDD,
} from '../correlation';

describe('pearsonCorrelation', () => {
  it('完全な正の相関で 1 を返す', () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r).toBeCloseTo(1.0);
  });

  it('完全な負の相関で -1 を返す', () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
    expect(r).toBeCloseTo(-1.0);
  });

  it('無相関で 0 に近い値を返す', () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [3, 1, 4, 1, 5]);
    expect(r).not.toBeNull();
    expect(Math.abs(r!)).toBeLessThan(0.5);
  });

  it('データが3点未満の場合 null を返す', () => {
    expect(pearsonCorrelation([1, 2], [3, 4])).toBeNull();
  });

  it('空配列の場合 null を返す', () => {
    expect(pearsonCorrelation([], [])).toBeNull();
  });

  it('全て同じ値の場合 null を返す（分散0）', () => {
    expect(pearsonCorrelation([5, 5, 5], [1, 2, 3])).toBeNull();
  });

  it('長さが異なる場合、短い方に合わせる', () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6]);
    expect(r).toBeCloseTo(1.0);
  });
});

describe('correlationLabel', () => {
  it('null は「データ不足」', () => {
    expect(correlationLabel(null)).toBe('データ不足');
  });

  it('0.8 は「強い正の相関」', () => {
    expect(correlationLabel(0.8)).toBe('強い正の相関');
  });

  it('-0.8 は「強い負の相関」', () => {
    expect(correlationLabel(-0.8)).toBe('強い負の相関');
  });

  it('0.5 は「やや正の相関」', () => {
    expect(correlationLabel(0.5)).toBe('やや正の相関');
  });

  it('-0.5 は「やや負の相関」', () => {
    expect(correlationLabel(-0.5)).toBe('やや負の相関');
  });

  it('0.3 は「弱い正の相関」', () => {
    expect(correlationLabel(0.3)).toBe('弱い正の相関');
  });

  it('0.1 は「相関なし」', () => {
    expect(correlationLabel(0.1)).toBe('相関なし');
  });
});

describe('correlationColor', () => {
  it('null はグレーを返す', () => {
    expect(correlationColor(null)).toContain('bg-gray');
  });

  it('強い正の相関は赤系を返す', () => {
    expect(correlationColor(0.8)).toContain('bg-red');
  });

  it('強い負の相関は青系を返す', () => {
    expect(correlationColor(-0.8)).toContain('bg-blue');
  });

  it('弱い相関はグレーを返す', () => {
    expect(correlationColor(0.1)).toContain('bg-gray');
  });
});

describe('calculateGDD', () => {
  const weatherData = [
    { date: '2026-03-01', tempAvg: 15 },
    { date: '2026-03-02', tempAvg: 20 },
    { date: '2026-03-03', tempAvg: 8 },
    { date: '2026-03-04', tempAvg: 25 },
    { date: '2026-02-28', tempAvg: 12 }, // startDate 以前
  ];

  it('GDD を正しく計算する（基温10℃）', () => {
    const result = calculateGDD(weatherData, '2026-03-01', 10);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      date: '2026-03-01',
      dailyGDD: 5,
      cumulativeGDD: 5,
    });
    expect(result[1]).toEqual({
      date: '2026-03-02',
      dailyGDD: 10,
      cumulativeGDD: 15,
    });
    // 8 - 10 = -2 → 0（基温以下はゼロ）
    expect(result[2]).toEqual({
      date: '2026-03-03',
      dailyGDD: 0,
      cumulativeGDD: 15,
    });
    expect(result[3]).toEqual({
      date: '2026-03-04',
      dailyGDD: 15,
      cumulativeGDD: 30,
    });
  });

  it('startDate 以前のデータを除外する', () => {
    const result = calculateGDD(weatherData, '2026-03-01');
    const dates = result.map((r) => r.date);
    expect(dates).not.toContain('2026-02-28');
  });

  it('tempAvg が null のデータを除外する', () => {
    const dataWithNull = [
      { date: '2026-03-01', tempAvg: 15 },
      { date: '2026-03-02', tempAvg: null },
      { date: '2026-03-03', tempAvg: 20 },
    ];
    const result = calculateGDD(dataWithNull, '2026-03-01');
    expect(result).toHaveLength(2);
  });

  it('空データの場合は空配列を返す', () => {
    const result = calculateGDD([], '2026-03-01');
    expect(result).toEqual([]);
  });
});
