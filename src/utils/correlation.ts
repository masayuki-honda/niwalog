/**
 * Statistical utility functions for Phase 3 analytics
 */

/**
 * Calculate Pearson correlation coefficient between two arrays
 * Returns a value between -1 and 1, or null if calculation is not possible
 */
export function pearsonCorrelation(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom === 0) return null;

  return sumXY / denom;
}

/**
 * Interpret correlation coefficient as text
 */
export function correlationLabel(r: number | null): string {
  if (r === null) return 'データ不足';
  const abs = Math.abs(r);
  if (abs >= 0.7) return r > 0 ? '強い正の相関' : '強い負の相関';
  if (abs >= 0.4) return r > 0 ? 'やや正の相関' : 'やや負の相関';
  if (abs >= 0.2) return r > 0 ? '弱い正の相関' : '弱い負の相関';
  return '相関なし';
}

/**
 * Get color for correlation coefficient badge
 */
export function correlationColor(r: number | null): string {
  if (r === null) return 'bg-gray-100 text-gray-600';
  const abs = Math.abs(r);
  if (abs >= 0.7) return r > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
  if (abs >= 0.4) return r > 0 ? 'bg-orange-100 text-orange-700' : 'bg-cyan-100 text-cyan-700';
  return 'bg-gray-100 text-gray-600';
}

/**
 * Calculate Growing Degree Days (GDD / 積算温度)
 * GDD = Σ max(avgTemp - baseTemp, 0) for each day since startDate
 */
export function calculateGDD(
  weatherData: { date: string; tempAvg: number | null }[],
  startDate: string,
  baseTemp: number = 10,
): { date: string; dailyGDD: number; cumulativeGDD: number }[] {
  const sorted = weatherData
    .filter((d) => d.date >= startDate && d.tempAvg !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  let cumulative = 0;
  return sorted.map((d) => {
    const daily = Math.max((d.tempAvg ?? 0) - baseTemp, 0);
    cumulative += daily;
    return {
      date: d.date,
      dailyGDD: Math.round(daily * 10) / 10,
      cumulativeGDD: Math.round(cumulative * 10) / 10,
    };
  });
}
