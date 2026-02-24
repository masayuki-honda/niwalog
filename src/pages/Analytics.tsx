import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Scatter,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Thermometer,
  Droplets,
  Zap,
  Sprout,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { getWeatherData, getActivities, getPlanters, getSoilSensorData } from '@/services/sheets-api';
import { withAuthRetry } from '@/utils/auth-retry';
import type { WeatherData, ActivityLog, Planter, SoilSensorData } from '@/types';
import { cn } from '@/utils';
import { format, parseISO, getYear } from '@/utils/date-imports';
import { pearsonCorrelation, correlationLabel, correlationColor, calculateGDD } from '@/utils/correlation';

// ===== Row converters =====

function rowToWeatherData(row: string[]): WeatherData {
  return {
    date: row[0] ?? '',
    tempMax: row[1] ? Number(row[1]) : null,
    tempMin: row[2] ? Number(row[2]) : null,
    tempAvg: row[3] ? Number(row[3]) : null,
    precipitation: row[4] ? Number(row[4]) : null,
    solarRadiation: row[5] ? Number(row[5]) : null,
    humidityAvg: row[6] ? Number(row[6]) : null,
    windSpeedMax: row[7] ? Number(row[7]) : null,
    source: row[8] ?? '',
    fetchedAt: row[9] ?? '',
  };
}

function rowToActivity(row: string[]): ActivityLog {
  return {
    id: row[0] ?? '',
    planterId: row[1] ?? '',
    userName: row[2] ?? '',
    activityType: row[3] as ActivityLog['activityType'],
    activityDate: row[4] ?? '',
    memo: row[5] ?? '',
    quantity: row[6] ? Number(row[6]) : null,
    unit: row[7] ?? '',
    photoFileIds: row[8] ? row[8].split(',').map((s) => s.trim()).filter(Boolean) : [],
    createdAt: row[9] ?? '',
  };
}

function rowToPlanter(row: string[]): Planter {
  return {
    id: row[0] ?? '',
    name: row[1] ?? '',
    cropName: row[2] ?? '',
    cropVariety: row[3] ?? '',
    location: row[4] ?? '',
    startDate: row[5] ?? '',
    endDate: row[6] ?? '',
    status: (row[7] as 'active' | 'archived') || 'active',
    imageFolderId: row[8] ?? '',
    memo: row[9] ?? '',
    createdAt: row[10] ?? '',
    updatedAt: row[11] ?? '',
  };
}

function rowToSoilSensorData(row: string[]): SoilSensorData {
  return {
    id: row[0] ?? '',
    planterId: row[1] ?? '',
    measuredAt: row[2] ?? '',
    vwc: row[3] ? Number(row[3]) : null,
    soilTemp: row[4] ? Number(row[4]) : null,
    ecBulk: row[5] ? Number(row[5]) : null,
    ecPore: row[6] ? Number(row[6]) : null,
    createdAt: row[7] ?? '',
  };
}

// ===== Tab types =====

type AnalyticsTab = 'harvest' | 'correlation' | 'gdd';

const TABS: { value: AnalyticsTab; label: string; icon: React.ReactNode }[] = [
  { value: 'harvest', label: '収穫', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'correlation', label: '相関分析', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'gdd', label: '積算温度', icon: <Thermometer className="w-4 h-4" /> },
];

// ===== Color palette =====
const CHART_COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

// ===== Main Component =====

export function Analytics() {
  const user = useAppStore((s) => s.user);
  const spreadsheetId = useAppStore((s) => s.spreadsheetId);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('harvest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [planters, setPlanters] = useState<Planter[]>([]);
  const [soilData, setSoilData] = useState<SoilSensorData[]>([]);

  // ── Fetch all data ──
  useEffect(() => {
    if (!user?.accessToken || !spreadsheetId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      withAuthRetry((token) => getWeatherData(spreadsheetId, token)),
      withAuthRetry((token) => getActivities(spreadsheetId, token)),
      withAuthRetry((token) => getPlanters(spreadsheetId, token)),
      withAuthRetry((token) => getSoilSensorData(spreadsheetId, token)),
    ])
      .then(([wRows, aRows, pRows, sRows]) => {
        setWeatherData(wRows.map(rowToWeatherData));
        setActivities(aRows.map(rowToActivity));
        setPlanters(pRows.map(rowToPlanter));
        setSoilData(sRows.map(rowToSoilSensorData));
      })
      .catch((err) => setError(err instanceof Error ? err.message : '読み込み失敗'))
      .finally(() => setLoading(false));
  }, [user?.accessToken, spreadsheetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 animate-pulse">データを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        📊 分析ダッシュボード
      </h1>

      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-white dark:bg-gray-700 text-garden-700 dark:text-garden-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'harvest' && (
        <HarvestDashboard activities={activities} planters={planters} />
      )}
      {activeTab === 'correlation' && (
        <CorrelationAnalysis
          weatherData={weatherData}
          activities={activities}
          planters={planters}
          soilData={soilData}
        />
      )}
      {activeTab === 'gdd' && (
        <GDDChart weatherData={weatherData} planters={planters} />
      )}
    </div>
  );
}

// =====================================================================
// 1. 収穫ダッシュボード
// =====================================================================

function HarvestDashboard({
  activities,
  planters,
}: {
  activities: ActivityLog[];
  planters: Planter[];
}) {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'crop'>('monthly');

  // Harvest records only
  const harvests = useMemo(
    () => activities.filter((a) => a.activityType === 'harvest' && a.quantity !== null && a.quantity > 0),
    [activities],
  );

  // Planter ID → crop name lookup
  const planterMap = useMemo(() => {
    const m = new Map<string, Planter>();
    planters.forEach((p) => m.set(p.id, p));
    return m;
  }, [planters]);

  // Statistics
  const totalHarvests = harvests.length;
  const totalQuantity = harvests.reduce((sum, h) => sum + (h.quantity ?? 0), 0);
  const uniqueCrops = new Set(harvests.map((h) => planterMap.get(h.planterId)?.cropName ?? '不明')).size;

  // Monthly data
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; total: number; count: number; byCrop: Record<string, number> }>();
    harvests.forEach((h) => {
      try {
        const d = parseISO(h.activityDate);
        const key = format(d, 'yyyy-MM');
        const crop = planterMap.get(h.planterId)?.cropName ?? '不明';
        if (!map.has(key)) map.set(key, { month: key, total: 0, count: 0, byCrop: {} });
        const entry = map.get(key)!;
        entry.total += h.quantity ?? 0;
        entry.count += 1;
        entry.byCrop[crop] = (entry.byCrop[crop] ?? 0) + (h.quantity ?? 0);
      } catch { /* skip invalid dates */ }
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [harvests, planterMap]);

  // Yearly data
  const yearlyData = useMemo(() => {
    const map = new Map<number, { year: number; total: number; count: number }>();
    harvests.forEach((h) => {
      try {
        const yr = getYear(parseISO(h.activityDate));
        if (!map.has(yr)) map.set(yr, { year: yr, total: 0, count: 0 });
        const entry = map.get(yr)!;
        entry.total += h.quantity ?? 0;
        entry.count += 1;
      } catch { /* */ }
    });
    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [harvests]);

  // Crop data
  const cropData = useMemo(() => {
    const map = new Map<string, { crop: string; total: number; count: number; unit: string }>();
    harvests.forEach((h) => {
      const crop = planterMap.get(h.planterId)?.cropName ?? '不明';
      if (!map.has(crop)) map.set(crop, { crop, total: 0, count: 0, unit: h.unit || 'g' });
      const entry = map.get(crop)!;
      entry.total += h.quantity ?? 0;
      entry.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [harvests, planterMap]);

  // All crop names for stacked chart
  const allCrops = useMemo(() => {
    const set = new Set<string>();
    monthlyData.forEach((m) => Object.keys(m.byCrop).forEach((c) => set.add(c)));
    return Array.from(set);
  }, [monthlyData]);

  // Monthly chart data with per-crop columns
  const monthlyChartData = useMemo(
    () => monthlyData.map((m) => ({ ...m, ...m.byCrop })),
    [monthlyData],
  );

  if (harvests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-4xl mb-4">🌿</p>
        <p className="text-gray-500">収穫記録がまだありません</p>
        <p className="text-gray-400 text-xs mt-1">作業記録で「収穫」を登録すると、ここに集計が表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="総収穫回数" value={`${totalHarvests}回`} icon={<BarChart3 className="w-5 h-5 text-green-600" />} />
        <SummaryCard label="総収穫量" value={`${Math.round(totalQuantity * 10) / 10}`} sub={harvests[0]?.unit || 'g'} icon={<Sprout className="w-5 h-5 text-emerald-600" />} />
        <SummaryCard label="作物種類" value={`${uniqueCrops}種`} icon={<TrendingUp className="w-5 h-5 text-blue-600" />} />
      </div>

      {/* View mode selector */}
      <div className="flex gap-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-1">
        {(['monthly', 'yearly', 'crop'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === mode
                ? 'bg-white dark:bg-gray-700 text-garden-700 dark:text-garden-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {mode === 'monthly' ? '月別' : mode === 'yearly' ? '年別' : '作物別'}
          </button>
        ))}
      </div>

      {/* Charts */}
      {viewMode === 'monthly' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold mb-3">月別収穫量</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const parts = v.split('-');
                  return `${parts[1]}月`;
                }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(v: string) => {
                  try { return format(parseISO(v + '-01'), 'yyyy年M月'); } catch { return v; }
                }}
                formatter={(value: number, name: string) => [`${Math.round(value * 10) / 10}`, name]}
              />
              <Legend />
              {allCrops.map((crop, i) => (
                <Bar
                  key={crop}
                  dataKey={crop}
                  stackId="harvest"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  name={crop}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === 'yearly' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold mb-3">年別収穫量</h3>
          {yearlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${Math.round(value * 10) / 10}`, '収穫量']} />
                <Bar dataKey="total" fill="#16a34a" name="収穫量" radius={[4, 4, 0, 0]} />
                <Line dataKey="count" stroke="#f59e0b" name="回数" yAxisId={0} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-8">データがありません</p>
          )}
        </div>
      )}

      {viewMode === 'crop' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold mb-3">作物別収穫量</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={cropData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="crop" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(value: number) => [`${Math.round(value * 10) / 10}`, '収穫量']} />
              <Bar dataKey="total" name="収穫量" radius={[0, 4, 4, 0]}>
                {cropData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>

          {/* Crop table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-2 pr-4 font-medium text-gray-500">作物</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 text-right">収穫量</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 text-right">回数</th>
                </tr>
              </thead>
              <tbody>
                {cropData.map((c) => (
                  <tr key={c.crop} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 pr-4 font-medium">{c.crop}</td>
                    <td className="py-2 pr-4 text-right">{Math.round(c.total * 10) / 10} {c.unit}</td>
                    <td className="py-2 pr-4 text-right">{c.count}回</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// 2. 相関分析
// =====================================================================

type CorrelationType = 'temp_harvest' | 'precipitation_vwc' | 'vwc_watering' | 'ec_fertilizing' | 'solar_harvest';

const CORRELATION_TYPES: { value: CorrelationType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'temp_harvest', label: '気温 × 収穫量', icon: <Thermometer className="w-4 h-4" />, description: '月平均気温と月間収穫量の相関' },
  { value: 'solar_harvest', label: '日射量 × 収穫量', icon: <TrendingUp className="w-4 h-4" />, description: '月間積算日射量と月間収穫量の相関' },
  { value: 'precipitation_vwc', label: '降水量 × VWC', icon: <Droplets className="w-4 h-4" />, description: '日間降水量と日平均VWCの相関' },
  { value: 'vwc_watering', label: 'VWC × 水やり', icon: <Droplets className="w-4 h-4" />, description: 'VWC時系列に水やりイベントをオーバーレイ' },
  { value: 'ec_fertilizing', label: 'EC × 施肥', icon: <Zap className="w-4 h-4" />, description: 'EC_PORE時系列に施肥イベントをオーバーレイ' },
];

function CorrelationAnalysis({
  weatherData,
  activities,
  planters,
  soilData,
}: {
  weatherData: WeatherData[];
  activities: ActivityLog[];
  planters: Planter[];
  soilData: SoilSensorData[];
}) {
  const [selected, setSelected] = useState<CorrelationType>('temp_harvest');

  const harvests = useMemo(
    () => activities.filter((a) => a.activityType === 'harvest' && a.quantity !== null && a.quantity > 0),
    [activities],
  );

  return (
    <div className="space-y-4">
      {/* Correlation type selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-garden-600" />
          <span className="text-sm font-medium">分析タイプ</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CORRELATION_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => setSelected(ct.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                selected === ct.value
                  ? 'bg-garden-100 dark:bg-garden-900/30 text-garden-700 dark:text-garden-400 ring-1 ring-garden-300'
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100',
              )}
            >
              {ct.icon}
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {selected === 'temp_harvest' && (
        <TempHarvestCorrelation weatherData={weatherData} harvests={harvests} />
      )}
      {selected === 'solar_harvest' && (
        <SolarHarvestCorrelation weatherData={weatherData} harvests={harvests} />
      )}
      {selected === 'precipitation_vwc' && (
        <PrecipitationVWCCorrelation weatherData={weatherData} soilData={soilData} />
      )}
      {selected === 'vwc_watering' && (
        <VWCWateringOverlay soilData={soilData} activities={activities} planters={planters} />
      )}
      {selected === 'ec_fertilizing' && (
        <ECFertilizingOverlay soilData={soilData} activities={activities} planters={planters} />
      )}
    </div>
  );
}

// ── 気温 × 収穫量 ──

function TempHarvestCorrelation({
  weatherData,
  harvests,
}: {
  weatherData: WeatherData[];
  harvests: ActivityLog[];
}) {
  const scatterData = useMemo(() => {
    // Monthly average temp
    const tempByMonth = new Map<string, { sum: number; count: number }>();
    weatherData.forEach((w) => {
      if (w.tempAvg === null) return;
      const key = w.date.slice(0, 7);
      if (!tempByMonth.has(key)) tempByMonth.set(key, { sum: 0, count: 0 });
      const e = tempByMonth.get(key)!;
      e.sum += w.tempAvg;
      e.count += 1;
    });

    // Monthly harvest
    const harvestByMonth = new Map<string, number>();
    harvests.forEach((h) => {
      const key = h.activityDate.slice(0, 7);
      harvestByMonth.set(key, (harvestByMonth.get(key) ?? 0) + (h.quantity ?? 0));
    });

    // Join
    const points: { avgTemp: number; harvest: number; month: string }[] = [];
    tempByMonth.forEach((val, key) => {
      const hv = harvestByMonth.get(key);
      if (hv !== undefined && hv > 0) {
        points.push({
          avgTemp: Math.round((val.sum / val.count) * 10) / 10,
          harvest: Math.round(hv * 10) / 10,
          month: key,
        });
      }
    });

    return points;
  }, [weatherData, harvests]);

  const r = useMemo(
    () => pearsonCorrelation(scatterData.map((d) => d.avgTemp), scatterData.map((d) => d.harvest)),
    [scatterData],
  );

  if (scatterData.length < 2) {
    return <EmptyState message="気温と収穫量の両方のデータが2ヶ月以上必要です" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">月平均気温 × 月間収穫量</h3>
        <CorrelationBadge r={r} />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="avgTemp" name="平均気温" unit="℃" tick={{ fontSize: 11 }} label={{ value: '平均気温 (℃)', position: 'insideBottom', offset: -5, fontSize: 11 }} />
          <YAxis dataKey="harvest" name="収穫量" tick={{ fontSize: 11 }} label={{ value: '収穫量', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number, name: string) => [
              `${value}${name === '平均気温' ? '℃' : ''}`,
              name,
            ]}
            labelFormatter={() => ''}
          />
          <Scatter data={scatterData} fill="#16a34a" name="月別">
            {scatterData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 日射量 × 収穫量 ──

function SolarHarvestCorrelation({
  weatherData,
  harvests,
}: {
  weatherData: WeatherData[];
  harvests: ActivityLog[];
}) {
  const scatterData = useMemo(() => {
    const solarByMonth = new Map<string, number>();
    weatherData.forEach((w) => {
      if (w.solarRadiation === null) return;
      const key = w.date.slice(0, 7);
      solarByMonth.set(key, (solarByMonth.get(key) ?? 0) + w.solarRadiation);
    });

    const harvestByMonth = new Map<string, number>();
    harvests.forEach((h) => {
      const key = h.activityDate.slice(0, 7);
      harvestByMonth.set(key, (harvestByMonth.get(key) ?? 0) + (h.quantity ?? 0));
    });

    const points: { solar: number; harvest: number; month: string }[] = [];
    solarByMonth.forEach((val, key) => {
      const hv = harvestByMonth.get(key);
      if (hv !== undefined && hv > 0) {
        points.push({
          solar: Math.round(val * 10) / 10,
          harvest: Math.round(hv * 10) / 10,
          month: key,
        });
      }
    });
    return points;
  }, [weatherData, harvests]);

  const r = useMemo(
    () => pearsonCorrelation(scatterData.map((d) => d.solar), scatterData.map((d) => d.harvest)),
    [scatterData],
  );

  if (scatterData.length < 2) {
    return <EmptyState message="日射量と収穫量の両方のデータが2ヶ月以上必要です" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">月間積算日射量 × 月間収穫量</h3>
        <CorrelationBadge r={r} />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="solar" name="日射量" unit="MJ/m²" tick={{ fontSize: 11 }} label={{ value: '積算日射量 (MJ/m²)', position: 'insideBottom', offset: -5, fontSize: 11 }} />
          <YAxis dataKey="harvest" name="収穫量" tick={{ fontSize: 11 }} label={{ value: '収穫量', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} labelFormatter={() => ''} />
          <Scatter data={scatterData} fill="#f59e0b" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 降水量 × VWC ──

function PrecipitationVWCCorrelation({
  weatherData,
  soilData,
}: {
  weatherData: WeatherData[];
  soilData: SoilSensorData[];
}) {
  const scatterData = useMemo(() => {
    // Daily VWC avg
    const vwcByDate = new Map<string, { sum: number; count: number }>();
    soilData.forEach((s) => {
      if (s.vwc === null) return;
      const key = s.measuredAt.slice(0, 10);
      if (!vwcByDate.has(key)) vwcByDate.set(key, { sum: 0, count: 0 });
      const e = vwcByDate.get(key)!;
      e.sum += s.vwc;
      e.count += 1;
    });

    // Weather precipitation by date
    const precipByDate = new Map<string, number>();
    weatherData.forEach((w) => {
      if (w.precipitation !== null) precipByDate.set(w.date, w.precipitation);
    });

    const points: { precipitation: number; vwc: number; date: string }[] = [];
    vwcByDate.forEach((val, date) => {
      const precip = precipByDate.get(date);
      if (precip !== undefined) {
        points.push({
          precipitation: precip,
          vwc: Math.round((val.sum / val.count) * 10) / 10,
          date,
        });
      }
    });
    return points;
  }, [weatherData, soilData]);

  const r = useMemo(
    () => pearsonCorrelation(scatterData.map((d) => d.precipitation), scatterData.map((d) => d.vwc)),
    [scatterData],
  );

  if (scatterData.length < 2) {
    return <EmptyState message="降水量と土壌センサーデータの両方が必要です。土壌センサーを設定してデータを蓄積してください。" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">日間降水量 × 日平均VWC</h3>
        <CorrelationBadge r={r} />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="precipitation" name="降水量" unit="mm" tick={{ fontSize: 11 }} label={{ value: '降水量 (mm)', position: 'insideBottom', offset: -5, fontSize: 11 }} />
          <YAxis dataKey="vwc" name="VWC" unit="%" tick={{ fontSize: 11 }} label={{ value: 'VWC (%)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} labelFormatter={() => ''} />
          <Scatter data={scatterData} fill="#2563eb" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── VWC × 水やり (overlay chart) ──

function VWCWateringOverlay({
  soilData,
  activities,
  planters,
}: {
  soilData: SoilSensorData[];
  activities: ActivityLog[];
  planters: Planter[];
}) {
  const [selectedPlanter, setSelectedPlanter] = useState<string>('all');

  // Planters that have soil data
  const plantersWithData = useMemo(() => {
    const ids = new Set(soilData.map((s) => s.planterId));
    return planters.filter((p) => ids.has(p.id));
  }, [soilData, planters]);

  const wateringEvents = useMemo(
    () => activities.filter((a) => a.activityType === 'watering'),
    [activities],
  );

  const chartData = useMemo(() => {
    const filteredSoil = selectedPlanter === 'all' ? soilData : soilData.filter((s) => s.planterId === selectedPlanter);

    // Daily VWC avg
    const vwcByDate = new Map<string, { sum: number; count: number }>();
    filteredSoil.forEach((s) => {
      if (s.vwc === null) return;
      const key = s.measuredAt.slice(0, 10);
      if (!vwcByDate.has(key)) vwcByDate.set(key, { sum: 0, count: 0 });
      const e = vwcByDate.get(key)!;
      e.sum += s.vwc;
      e.count += 1;
    });

    // Watering events by date
    const wateringDates = new Set<string>();
    wateringEvents.forEach((w) => {
      if (selectedPlanter === 'all' || w.planterId === selectedPlanter) {
        wateringDates.add(w.activityDate);
      }
    });

    // Merge data
    const dates = new Set([...vwcByDate.keys(), ...wateringDates]);
    return Array.from(dates)
      .sort()
      .map((date) => {
        const vwcEntry = vwcByDate.get(date);
        return {
          date,
          vwc: vwcEntry ? Math.round((vwcEntry.sum / vwcEntry.count) * 10) / 10 : null,
          watering: wateringDates.has(date) ? 1 : 0,
        };
      });
  }, [soilData, wateringEvents, selectedPlanter]);

  if (soilData.length === 0) {
    return <EmptyState message="土壌センサーデータがまだありません。センサーを設定してデータを蓄積してください。" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold">VWC × 水やりイベント</h3>
        {plantersWithData.length > 0 && (
          <PlanterSelector
            planters={plantersWithData}
            value={selectedPlanter}
            onChange={setSelectedPlanter}
          />
        )}
      </div>
      <p className="text-xs text-gray-500">オレンジのバーは水やりを行った日を示します</p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis yAxisId="vwc" tick={{ fontSize: 11 }} domain={[0, 60]} label={{ value: 'VWC (%)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <YAxis yAxisId="event" orientation="right" hide domain={[0, 5]} />
          <Tooltip
            labelFormatter={(v: string) => {
              try { return format(parseISO(v), 'yyyy年M月d日'); } catch { return v; }
            }}
            formatter={(value: number, name: string) => {
              if (name === '水やり') return [value ? '実施' : '-', name];
              return [`${value}%`, name];
            }}
          />
          <Legend />
          <ReferenceLine yAxisId="vwc" y={20} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'DRY', position: 'right', fontSize: 10 }} />
          <ReferenceLine yAxisId="vwc" y={45} stroke="#2563eb" strokeDasharray="3 3" label={{ value: 'WET', position: 'right', fontSize: 10 }} />
          <Bar yAxisId="event" dataKey="watering" fill="#f97316" opacity={0.5} name="水やり" />
          <Line yAxisId="vwc" type="monotone" dataKey="vwc" stroke="#2563eb" strokeWidth={2} dot={false} name="VWC" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── EC × 施肥 (overlay chart) ──

function ECFertilizingOverlay({
  soilData,
  activities,
  planters,
}: {
  soilData: SoilSensorData[];
  activities: ActivityLog[];
  planters: Planter[];
}) {
  const [selectedPlanter, setSelectedPlanter] = useState<string>('all');

  const plantersWithData = useMemo(() => {
    const ids = new Set(soilData.map((s) => s.planterId));
    return planters.filter((p) => ids.has(p.id));
  }, [soilData, planters]);

  const fertilizingEvents = useMemo(
    () => activities.filter((a) => a.activityType === 'fertilizing'),
    [activities],
  );

  const chartData = useMemo(() => {
    const filteredSoil = selectedPlanter === 'all' ? soilData : soilData.filter((s) => s.planterId === selectedPlanter);

    // Daily EC_PORE avg
    const ecByDate = new Map<string, { sum: number; count: number }>();
    filteredSoil.forEach((s) => {
      if (s.ecPore === null) return;
      const key = s.measuredAt.slice(0, 10);
      if (!ecByDate.has(key)) ecByDate.set(key, { sum: 0, count: 0 });
      const e = ecByDate.get(key)!;
      e.sum += s.ecPore;
      e.count += 1;
    });

    const fertDates = new Set<string>();
    fertilizingEvents.forEach((f) => {
      if (selectedPlanter === 'all' || f.planterId === selectedPlanter) {
        fertDates.add(f.activityDate);
      }
    });

    const dates = new Set([...ecByDate.keys(), ...fertDates]);
    return Array.from(dates)
      .sort()
      .map((date) => {
        const ecEntry = ecByDate.get(date);
        return {
          date,
          ecPore: ecEntry ? Math.round((ecEntry.sum / ecEntry.count) * 100) / 100 : null,
          fertilizing: fertDates.has(date) ? 1 : 0,
        };
      });
  }, [soilData, fertilizingEvents, selectedPlanter]);

  if (soilData.length === 0) {
    return <EmptyState message="土壌センサーデータがまだありません。センサーを設定してデータを蓄積してください。" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold">EC(PORE) × 施肥イベント</h3>
        {plantersWithData.length > 0 && (
          <PlanterSelector
            planters={plantersWithData}
            value={selectedPlanter}
            onChange={setSelectedPlanter}
          />
        )}
      </div>
      <p className="text-xs text-gray-500">緑のバーは施肥を行った日を示します</p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis yAxisId="ec" tick={{ fontSize: 11 }} label={{ value: 'EC (dS/m)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <YAxis yAxisId="event" orientation="right" hide domain={[0, 5]} />
          <Tooltip
            labelFormatter={(v: string) => {
              try { return format(parseISO(v), 'yyyy年M月d日'); } catch { return v; }
            }}
            formatter={(value: number, name: string) => {
              if (name === '施肥') return [value ? '実施' : '-', name];
              return [`${value} dS/m`, name];
            }}
          />
          <Legend />
          <Bar yAxisId="event" dataKey="fertilizing" fill="#16a34a" opacity={0.5} name="施肥" />
          <Line yAxisId="ec" type="monotone" dataKey="ecPore" stroke="#8b5cf6" strokeWidth={2} dot={false} name="EC(PORE)" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// =====================================================================
// 3. 積算温度 (GDD)
// =====================================================================

function GDDChart({
  weatherData,
  planters,
}: {
  weatherData: WeatherData[];
  planters: Planter[];
}) {
  const [selectedPlanter, setSelectedPlanter] = useState<string>('');
  const [baseTemp, setBaseTemp] = useState<number>(10);

  // Active planters with start date
  const activePlanters = useMemo(
    () => planters.filter((p) => p.startDate && p.status === 'active'),
    [planters],
  );

  // Auto-select first planter
  useEffect(() => {
    if (!selectedPlanter && activePlanters.length > 0) {
      setSelectedPlanter(activePlanters[0].id);
    }
  }, [activePlanters, selectedPlanter]);

  const selected = useMemo(
    () => planters.find((p) => p.id === selectedPlanter),
    [planters, selectedPlanter],
  );

  const gddData = useMemo(() => {
    if (!selected?.startDate) return [];
    return calculateGDD(weatherData, selected.startDate, baseTemp);
  }, [weatherData, selected, baseTemp]);

  if (activePlanters.length === 0) {
    return <EmptyState message="栽培開始日が設定された栽培区画がありません。栽培区画の設定を確認してください。" />;
  }

  const latestGDD = gddData.length > 0 ? gddData[gddData.length - 1].cumulativeGDD : 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">栽培区画</label>
            <select
              value={selectedPlanter}
              onChange={(e) => setSelectedPlanter(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              {activePlanters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.cropName})
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 mb-1">基準温度 (℃)</label>
            <input
              type="number"
              value={baseTemp}
              onChange={(e) => setBaseTemp(Number(e.target.value))}
              min={0}
              max={30}
              className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        {selected && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>🌱 栽培開始: {selected.startDate}</span>
            <span>🌡️ 積算温度: <span className="font-bold text-garden-700 dark:text-garden-400">{latestGDD} ℃・日</span></span>
            <span>📊 データ数: {gddData.length}日</span>
          </div>
        )}
      </div>

      {/* GDD Chart */}
      {gddData.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold mb-3">積算温度推移</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={gddData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => {
                  try { return format(parseISO(v), 'M/d'); } catch { return v; }
                }}
              />
              <YAxis
                yAxisId="cumulative"
                tick={{ fontSize: 11 }}
                label={{ value: '積算温度 (℃・日)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <YAxis
                yAxisId="daily"
                orientation="right"
                tick={{ fontSize: 11 }}
                label={{ value: '日別GDD (℃)', angle: 90, position: 'insideRight', fontSize: 11 }}
              />
              <Tooltip
                labelFormatter={(v: string) => {
                  try { return format(parseISO(v), 'yyyy年M月d日'); } catch { return v; }
                }}
                formatter={(value: number, name: string) => [
                  `${value} ${name.includes('積算') ? '℃・日' : '℃'}`,
                  name,
                ]}
              />
              <Legend />
              <Bar
                yAxisId="daily"
                dataKey="dailyGDD"
                fill="#fbbf24"
                opacity={0.4}
                name="日別GDD"
              />
              <Line
                yAxisId="cumulative"
                type="monotone"
                dataKey="cumulativeGDD"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                name="積算温度"
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* GDD milestones info */}
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">📐 積算温度の目安（基準温度 {baseTemp}℃）</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-amber-700 dark:text-amber-400">
              <span>トマト 開花: ~600℃・日</span>
              <span>トマト 収穫: ~1100℃・日</span>
              <span>キュウリ 収穫: ~900℃・日</span>
              <span>ナス 収穫: ~1000℃・日</span>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState message="選択した栽培区画の栽培開始日以降の気象データがありません" />
      )}
    </div>
  );
}

// =====================================================================
// Shared UI Components
// =====================================================================

function SummaryCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold">
        {value}
        {sub && <span className="text-xs font-normal text-gray-500 ml-1">{sub}</span>}
      </p>
    </div>
  );
}

function CorrelationBadge({ r }: { r: number | null }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', correlationColor(r))}>
      r = {r !== null ? r.toFixed(2) : '—'} ({correlationLabel(r)})
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
      <p className="text-4xl mb-4">📊</p>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

function PlanterSelector({
  planters,
  value,
  onChange,
}: {
  planters: Planter[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 border rounded-lg text-xs bg-white dark:bg-gray-700 dark:border-gray-600"
    >
      <option value="all">全区画</option>
      {planters.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.cropName})
        </option>
      ))}
    </select>
  );
}
