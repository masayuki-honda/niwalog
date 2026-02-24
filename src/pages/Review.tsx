import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { ACTIVITY_TYPE_CONFIG } from '@/constants';
import { withAuthRetry } from '@/utils/auth-retry';
import { getWeatherData } from '@/services/sheets-api';
import { parseISO, getYear, getMonth } from '@/utils/date-imports';
import { cn } from '@/utils';
import type { WeatherData, ActivityLog } from '@/types';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Droplets, Sun, Thermometer, BarChart3 } from 'lucide-react';

type ViewMode = 'monthly' | 'yearly';

export function Review() {
  const { activities, planters, spreadsheetId, user } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-based
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);

  // 気象データ取得
  useEffect(() => {
    if (!user?.accessToken || !spreadsheetId) return;
    withAuthRetry((token) => getWeatherData(spreadsheetId, token))
      .then((rows) => {
        const parsed: WeatherData[] = rows.map((r) => ({
          date: r[0] ?? '',
          tempMax: r[1] ? Number(r[1]) : null,
          tempMin: r[2] ? Number(r[2]) : null,
          tempAvg: r[3] ? Number(r[3]) : null,
          precipitation: r[4] ? Number(r[4]) : null,
          solarRadiation: r[5] ? Number(r[5]) : null,
          humidityAvg: r[6] ? Number(r[6]) : null,
          windSpeedMax: r[7] ? Number(r[7]) : null,
          source: r[8] ?? '',
          fetchedAt: r[9] ?? '',
        }));
        setWeatherData(parsed);
      })
      .catch(() => {});
  }, [user?.accessToken, spreadsheetId]);

  // フィルタされたアクティビティ
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (!a.activityDate) return false;
      const d = parseISO(a.activityDate);
      if (viewMode === 'yearly') return getYear(d) === selectedYear;
      return getYear(d) === selectedYear && getMonth(d) === selectedMonth;
    });
  }, [activities, viewMode, selectedYear, selectedMonth]);

  // フィルタされた気象データ
  const filteredWeather = useMemo(() => {
    return weatherData.filter((w) => {
      if (!w.date) return false;
      const d = parseISO(w.date);
      if (viewMode === 'yearly') return getYear(d) === selectedYear;
      return getYear(d) === selectedYear && getMonth(d) === selectedMonth;
    });
  }, [weatherData, viewMode, selectedYear, selectedMonth]);

  // 作業種別ごとの集計
  const activitySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    filteredActivities.forEach((a) => {
      summary[a.activityType] = (summary[a.activityType] ?? 0) + 1;
    });
    return Object.entries(summary)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        type: type as ActivityLog['activityType'],
        count,
        config: ACTIVITY_TYPE_CONFIG[type as ActivityLog['activityType']],
      }));
  }, [filteredActivities]);

  // 収穫サマリー
  const harvestSummary = useMemo(() => {
    const harvests = filteredActivities.filter((a) => a.activityType === 'harvest' && a.quantity);
    const byCrop: Record<string, { cropName: string; total: number; unit: string; count: number }> = {};
    harvests.forEach((a) => {
      const planter = planters.find((p) => p.id === a.planterId);
      const key = planter?.cropName ?? '不明';
      if (!byCrop[key]) {
        byCrop[key] = { cropName: key, total: 0, unit: a.unit || 'g', count: 0 };
      }
      byCrop[key].total += a.quantity!;
      byCrop[key].count += 1;
    });
    return Object.values(byCrop).sort((a, b) => b.total - a.total);
  }, [filteredActivities, planters]);

  // 気象概況
  const weatherSummary = useMemo(() => {
    if (filteredWeather.length === 0) return null;
    const temps = filteredWeather.filter((w) => w.tempAvg !== null).map((w) => w.tempAvg!);
    const maxTemps = filteredWeather.filter((w) => w.tempMax !== null).map((w) => w.tempMax!);
    const minTemps = filteredWeather.filter((w) => w.tempMin !== null).map((w) => w.tempMin!);
    const precip = filteredWeather.filter((w) => w.precipitation !== null).map((w) => w.precipitation!);
    const solar = filteredWeather.filter((w) => w.solarRadiation !== null).map((w) => w.solarRadiation!);

    return {
      avgTemp: temps.length > 0 ? (temps.reduce((s, t) => s + t, 0) / temps.length).toFixed(1) : '-',
      maxTemp: maxTemps.length > 0 ? Math.max(...maxTemps).toFixed(1) : '-',
      minTemp: minTemps.length > 0 ? Math.min(...minTemps).toFixed(1) : '-',
      totalPrecip: precip.length > 0 ? precip.reduce((s, p) => s + p, 0).toFixed(1) : '-',
      avgSolar: solar.length > 0 ? (solar.reduce((s, v) => s + v, 0) / solar.length).toFixed(1) : '-',
      days: filteredWeather.length,
    };
  }, [filteredWeather]);

  // プランターごとのアクティビティ集計
  const planterSummary = useMemo(() => {
    const byPlanter: Record<string, { name: string; cropName: string; activityCount: number; harvestTotal: number; unit: string }> = {};
    filteredActivities.forEach((a) => {
      const planter = planters.find((p) => p.id === a.planterId);
      if (!planter) return;
      if (!byPlanter[a.planterId]) {
        byPlanter[a.planterId] = {
          name: planter.name,
          cropName: planter.cropName,
          activityCount: 0,
          harvestTotal: 0,
          unit: '',
        };
      }
      byPlanter[a.planterId].activityCount += 1;
      if (a.activityType === 'harvest' && a.quantity) {
        byPlanter[a.planterId].harvestTotal += a.quantity;
        byPlanter[a.planterId].unit = a.unit || 'g';
      }
    });
    return Object.values(byPlanter).sort((a, b) => b.activityCount - a.activityCount);
  }, [filteredActivities, planters]);

  // 月別の作業回数（年次ビュー用）
  const monthlyBreakdown = useMemo(() => {
    if (viewMode !== 'yearly') return [];
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: `${i + 1}月`,
      count: 0,
      harvestCount: 0,
    }));
    filteredActivities.forEach((a) => {
      if (!a.activityDate) return;
      const m = getMonth(parseISO(a.activityDate));
      months[m].count += 1;
      if (a.activityType === 'harvest') months[m].harvestCount += 1;
    });
    return months;
  }, [filteredActivities, viewMode]);

  const periodLabel = viewMode === 'monthly'
    ? `${selectedYear}年${selectedMonth + 1}月`
    : `${selectedYear}年`;

  const handlePrev = () => {
    if (viewMode === 'monthly') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((y) => y - 1);
      } else {
        setSelectedMonth((m) => m - 1);
      }
    } else {
      setSelectedYear((y) => y - 1);
    }
  };

  const handleNext = () => {
    if (viewMode === 'monthly') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((y) => y + 1);
      } else {
        setSelectedMonth((m) => m + 1);
      }
    } else {
      setSelectedYear((y) => y + 1);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📋 振り返り</h1>

      {/* View mode toggle */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setViewMode('monthly')}
          className={cn(
            'flex-1 py-1.5 text-sm rounded-md transition-colors',
            viewMode === 'monthly'
              ? 'bg-white dark:bg-gray-700 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Calendar size={14} className="inline mr-1" />
          月次
        </button>
        <button
          onClick={() => setViewMode('yearly')}
          className={cn(
            'flex-1 py-1.5 text-sm rounded-md transition-colors',
            viewMode === 'yearly'
              ? 'bg-white dark:bg-gray-700 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <BarChart3 size={14} className="inline mr-1" />
          年次
        </button>
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <button onClick={handlePrev} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold">{periodLabel}</span>
        <button onClick={handleNext} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-2xl font-bold text-garden-600">{filteredActivities.length}</p>
          <p className="text-xs text-gray-500">作業回数</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{harvestSummary.reduce((s, h) => s + h.count, 0)}</p>
          <p className="text-xs text-gray-500">収穫回数</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{planterSummary.length}</p>
          <p className="text-xs text-gray-500">管理区画数</p>
        </div>
      </div>

      {/* Weather summary */}
      {weatherSummary && (
        <section className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-100 dark:border-blue-800 p-4 space-y-2">
          <h2 className="text-sm font-bold flex items-center gap-1">
            <Thermometer size={14} />
            気象概況
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Thermometer size={12} className="text-red-500" />
              <span className="text-gray-600 dark:text-gray-400">平均気温</span>
              <span className="font-medium">{weatherSummary.avgTemp}℃</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-orange-500" />
              <span className="text-gray-600 dark:text-gray-400">最高/最低</span>
              <span className="font-medium">{weatherSummary.maxTemp}/{weatherSummary.minTemp}℃</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets size={12} className="text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">累計降水量</span>
              <span className="font-medium">{weatherSummary.totalPrecip}mm</span>
            </div>
            <div className="flex items-center gap-2">
              <Sun size={12} className="text-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">平均日射量</span>
              <span className="font-medium">{weatherSummary.avgSolar} MJ/m²</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-right">{weatherSummary.days}日分のデータ</p>
        </section>
      )}

      {/* Activity breakdown */}
      {activitySummary.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="text-sm font-bold">📊 作業種別</h2>
          <div className="space-y-2">
            {activitySummary.map(({ type, count, config }) => {
              const maxCount = activitySummary[0].count;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-sm w-6 text-center">{config.emoji}</span>
                  <span className="text-sm w-20 truncate">{config.label}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-garden-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Harvest summary */}
      {harvestSummary.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="text-sm font-bold">🌿 収穫サマリー</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                  <th className="py-1 pr-2">作物</th>
                  <th className="py-1 pr-2 text-right">合計</th>
                  <th className="py-1 text-right">回数</th>
                </tr>
              </thead>
              <tbody>
                {harvestSummary.map((h) => (
                  <tr key={h.cropName} className="border-b dark:border-gray-700 last:border-0">
                    <td className="py-1.5 pr-2 font-medium">{h.cropName}</td>
                    <td className="py-1.5 pr-2 text-right">{h.total.toLocaleString()} {h.unit}</td>
                    <td className="py-1.5 text-right text-gray-500">{h.count}回</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Monthly breakdown (yearly view) */}
      {viewMode === 'yearly' && monthlyBreakdown.some((m) => m.count > 0) && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="text-sm font-bold">📅 月別作業回数</h2>
          <div className="space-y-1">
            {monthlyBreakdown.map((m) => {
              const maxCount = Math.max(...monthlyBreakdown.map((mm) => mm.count));
              const pct = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-right text-gray-500">{m.label}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-garden-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right font-medium">{m.count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Planter summary */}
      {planterSummary.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="text-sm font-bold">🌱 栽培区画別</h2>
          <div className="space-y-2">
            {planterSummary.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm border-b dark:border-gray-700 last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.cropName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">作業 {p.activityCount}回</p>
                  {p.harvestTotal > 0 && (
                    <p className="text-xs text-green-600">収穫 {p.harvestTotal.toLocaleString()}{p.unit}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {filteredActivities.length === 0 && !weatherSummary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-4xl mb-4">📝</p>
          <p className="text-gray-500 text-sm">
            {periodLabel}の記録がありません
          </p>
        </div>
      )}
    </div>
  );
}
