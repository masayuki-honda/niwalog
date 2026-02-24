import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Cloud, Thermometer, Droplets, Sun, Wind } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { getWeatherData } from '@/services/sheets-api';
import { withAuthRetry } from '@/utils/auth-retry';
import type { WeatherData } from '@/types';
import { cn } from '@/utils';
import { format, parseISO, subMonths, subDays } from '@/utils/date-imports';

// ===== Row → Type conversion =====

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

// ===== Period filter =====

type Period = '1w' | '1m' | '3m' | '1y' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1w', label: '1週間' },
  { value: '1m', label: '1ヶ月' },
  { value: '3m', label: '3ヶ月' },
  { value: '1y', label: '1年' },
  { value: 'all', label: '全期間' },
];

function getStartDate(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case '1w':
      return subDays(now, 7);
    case '1m':
      return subMonths(now, 1);
    case '3m':
      return subMonths(now, 3);
    case '1y':
      return subMonths(now, 12);
    case 'all':
      return null;
  }
}

// ===== Tab definition =====

type TabId = 'temperature' | 'precipitation' | 'solar' | 'overview';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '概要', icon: <Cloud size={16} /> },
  { id: 'temperature', label: '気温', icon: <Thermometer size={16} /> },
  { id: 'precipitation', label: '降水量', icon: <Droplets size={16} /> },
  { id: 'solar', label: '日射量', icon: <Sun size={16} /> },
];

// ===== Chart tooltip =====

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; unit?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value != null ? entry.value : '-'}
          {entry.unit ?? ''}
        </p>
      ))}
    </div>
  );
}

// ===== Summary card =====

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  color: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      )}
    >
      <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold">
          {value}{' '}
          <span className="text-sm font-normal text-gray-500">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ===== Main component =====

export function Weather() {
  const { user, spreadsheetId } = useAppStore();
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('1m');
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Fetch weather data
  useEffect(() => {
    if (!user?.accessToken || !spreadsheetId) return;
    setLoading(true);
    setError(null);

    withAuthRetry((token) => getWeatherData(spreadsheetId, token))
      .then((rows) => {
        const data = rows
          .map(rowToWeatherData)
          .sort((a, b) => a.date.localeCompare(b.date));
        setWeatherData(data);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : '気象データの取得に失敗しました',
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.accessToken, spreadsheetId]);

  // Filter by period
  const filteredData = useMemo(() => {
    const startDate = getStartDate(period);
    if (!startDate) return weatherData;
    const startStr = format(startDate, 'yyyy-MM-dd');
    return weatherData.filter((d) => d.date >= startStr);
  }, [weatherData, period]);

  // Chart data with formatted date labels
  const chartData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      dateLabel: d.date ? format(parseISO(d.date), 'M/d') : '',
    }));
  }, [filteredData]);

  // Latest day data
  const latestData =
    weatherData.length > 0 ? weatherData[weatherData.length - 1] : null;

  // Summary statistics for the selected period
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const temps = filteredData
      .filter((d) => d.tempAvg != null)
      .map((d) => d.tempAvg!);
    const precip = filteredData
      .filter((d) => d.precipitation != null)
      .map((d) => d.precipitation!);
    const solar = filteredData
      .filter((d) => d.solarRadiation != null)
      .map((d) => d.solarRadiation!);
    return {
      avgTemp:
        temps.length > 0
          ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
          : '-',
      totalPrecip:
        precip.length > 0
          ? precip.reduce((a, b) => a + b, 0).toFixed(1)
          : '-',
      avgSolar:
        solar.length > 0
          ? (solar.reduce((a, b) => a + b, 0) / solar.length).toFixed(1)
          : '-',
      days: filteredData.length,
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <span className="text-4xl animate-bounce">🌤️</span>
          <p className="mt-2 text-gray-500 animate-pulse">
            気象データを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">🌤️ 天気データ</h1>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (weatherData.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">🌤️ 天気データ</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-4xl mb-4">🌡️</p>
          <p className="text-gray-500 text-sm">気象データがまだありません</p>
          <p className="text-gray-400 text-xs mt-2">
            GAS の気象データ取得スクリプトを設定して、毎日自動でデータが蓄積されるようにしてください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🌤️ 天気データ</h1>

      {/* Latest day summary */}
      {latestData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Thermometer size={18} className="text-red-500" />}
            label={`最新 (${latestData.date})`}
            value={
              latestData.tempMax != null && latestData.tempMin != null
                ? `${latestData.tempMax}/${latestData.tempMin}`
                : '-'
            }
            unit="℃"
            color="bg-red-50 dark:bg-red-900/20"
          />
          <StatCard
            icon={<Droplets size={18} className="text-blue-500" />}
            label="降水量"
            value={latestData.precipitation ?? '-'}
            unit="mm"
            color="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            icon={<Sun size={18} className="text-amber-500" />}
            label="日射量"
            value={latestData.solarRadiation ?? '-'}
            unit="MJ/m²"
            color="bg-amber-50 dark:bg-amber-900/20"
          />
          <StatCard
            icon={<Wind size={18} className="text-teal-500" />}
            label="最大風速"
            value={latestData.windSpeedMax ?? '-'}
            unit="m/s"
            color="bg-teal-50 dark:bg-teal-900/20"
          />
        </div>
      )}

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm transition-colors',
              period === opt.value
                ? 'bg-garden-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Period stats */}
      {stats && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>📊 {stats.days}日間</span>
          <span>🌡️ 平均 {stats.avgTemp}℃</span>
          <span>🌧️ 合計 {stats.totalPrecip}mm</span>
          <span>☀️ 平均 {stats.avgSolar} MJ/m²</span>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm flex-1 transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 shadow-sm font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                気温・降水量
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="temp"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: '℃',
                      position: 'insideTopLeft',
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="precip"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: 'mm',
                      position: 'insideTopRight',
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="precip"
                    dataKey="precipitation"
                    name="降水量"
                    fill="#93c5fd"
                    opacity={0.6}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="tempMax"
                    name="最高気温"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="tempMin"
                    name="最低気温"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'temperature' && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">気温推移</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: '℃',
                    position: 'insideTopLeft',
                    offset: -5,
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="tempMax"
                  name="最高気温"
                  stroke="#ef4444"
                  fill="#fecaca"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="tempMin"
                  name="最低気温"
                  stroke="#3b82f6"
                  fill="#bfdbfe"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="tempAvg"
                  name="平均気温"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'precipitation' && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              降水量
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'mm',
                    position: 'insideTopLeft',
                    offset: -5,
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="precipitation"
                  name="降水量"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="humidityAvg"
                  name="平均湿度 (%)"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'solar' && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">日射量</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'MJ/m²',
                    position: 'insideTopLeft',
                    offset: -5,
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="solarRadiation"
                  name="日射量"
                  stroke="#f59e0b"
                  fill="#fde68a"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Data table (recent entries) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 p-3 border-b border-gray-200 dark:border-gray-700">
          直近のデータ
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                <th className="px-3 py-2 font-medium">日付</th>
                <th className="px-3 py-2 font-medium text-right">最高℃</th>
                <th className="px-3 py-2 font-medium text-right">最低℃</th>
                <th className="px-3 py-2 font-medium text-right">降水mm</th>
                <th className="px-3 py-2 font-medium text-right">日射MJ</th>
                <th className="px-3 py-2 font-medium text-right hidden md:table-cell">
                  湿度%
                </th>
                <th className="px-3 py-2 font-medium text-right hidden md:table-cell">
                  風速m/s
                </th>
              </tr>
            </thead>
            <tbody>
              {[...filteredData]
                .reverse()
                .slice(0, 10)
                .map((d) => (
                  <tr
                    key={d.date}
                    className="border-t border-gray-100 dark:border-gray-700"
                  >
                    <td className="px-3 py-2">{d.date}</td>
                    <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                      {d.tempMax ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                      {d.tempMin ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {d.precipitation ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {d.solarRadiation ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right hidden md:table-cell">
                      {d.humidityAvg ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right hidden md:table-cell">
                      {d.windSpeedMax ?? '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
