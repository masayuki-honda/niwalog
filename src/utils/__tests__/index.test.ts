import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  daysSince,
  generateId,
  nowISO,
  todayStr,
  cn,
  parsePhotoIds,
  joinPhotoIds,
} from '../index';

describe('formatDate', () => {
  it('デフォルトフォーマットで日付を整形する', () => {
    const result = formatDate('2026-02-26');
    expect(result).toBe('2月26日(木)');
  });

  it('カスタムフォーマットを使用できる', () => {
    const result = formatDate('2026-02-26', 'yyyy/MM/dd');
    expect(result).toBe('2026/02/26');
  });

  it('不正な日付文字列はそのまま返す', () => {
    expect(formatDate('invalid')).toBe('invalid');
  });

  it('空文字列はそのまま返す', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('daysSince', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('過去の日付からの日数を計算する', () => {
    expect(daysSince('2026-02-24')).toBe(2);
  });

  it('当日は0を返す', () => {
    expect(daysSince('2026-02-26')).toBe(0);
  });

  it('不正な日付は0を返す', () => {
    expect(daysSince('invalid')).toBe(0);
  });
});

describe('generateId', () => {
  it('文字列を返す', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('空文字列ではない', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });
});

describe('nowISO', () => {
  it('ISO 8601 形式の文字列を返す', () => {
    const result = nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('todayStr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('yyyy-MM-dd 形式で今日の日付を返す', () => {
    expect(todayStr()).toBe('2026-02-26');
  });
});

describe('cn', () => {
  it('複数のクラス名を結合する', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('falsy な値を除外する', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar');
  });

  it('空の場合は空文字列を返す', () => {
    expect(cn()).toBe('');
  });
});

describe('parsePhotoIds', () => {
  it('カンマ区切りの文字列を配列に変換する', () => {
    expect(parsePhotoIds('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('空白をトリムする', () => {
    expect(parsePhotoIds('a , b , c')).toEqual(['a', 'b', 'c']);
  });

  it('空文字列は空配列を返す', () => {
    expect(parsePhotoIds('')).toEqual([]);
  });

  it('空要素を除外する', () => {
    expect(parsePhotoIds('a,,b')).toEqual(['a', 'b']);
  });
});

describe('joinPhotoIds', () => {
  it('配列をカンマ区切りの文字列に変換する', () => {
    expect(joinPhotoIds(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('空配列は空文字列を返す', () => {
    expect(joinPhotoIds([])).toBe('');
  });
});
