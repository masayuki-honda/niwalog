import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Droplets, Thermometer, Zap, Activity } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { getSoilSensorData } from '@/services/sheets-api';
import { withAuthRetry } from '@/utils/auth-retry';
import type { SoilSensorData } from '@/types';
import { cn } from '@/utils';
import { format, parseISO, subMonths, subDays } from '@/utils/date-imports';

// ===== Row → Type conversion =====

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

// ===== Period filter =====

type Period = '1d' | '1w' | '1m' | '3m' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1d', label: '24時間' },
  { value: '1w', label: '1週間' },
  { value: '1m', label: '1ヶ月' },
  { value: '3m', label: '3ヶ月' },
  { value: 'all', label: '全期間' },
];

function getStartDate(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case '1d':
      return subDays(now, 1);
    case '1w':
      return subDays(now, 7);
    case '1m':
      return subMonths(now, 1);
    case '3m':
      return subMonths(now, 3);
    case 'all':
      return null;
  }
}

// ===== Tab definition =====

type TabId = 'vwc' | 'soilTemp' | 'ec' | 'overview';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '概要', icon: <Activity size={16} /> },
  { id: 'vwc', label: 'VWC', icon: <Droplets size={16} /> },
  { id: 'soilTemp', label: '地温', icon: <Thermometer size={16} /> },
  { id: 'ec', label: 'EC', icon: <Zap size={16} /> },
];

// ===== VWC thresholds =====
const VWC_DRY = 20; // Below this = dry
const VWC_WET = 45; // Above this = too wet

// ===== Chart tooltip =====

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value != null ? entry.value : '-'}
        </p>
      ))}
    </div>
  );
}

// ===== Stat card =====

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  color: string;
  status?: string;
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
        {status && (
          <p className="text-xs text-gray-400">{status}</p>
        )}
      </div>
    </div>
  );
}

// ===== VWC status =====
function getVwcStatus(vwc: number | null): string {
  if (vwc == null) return '';
  if (vwc < VWC_DRY) return '🔴 乾燥';
  if (vwc > VWC_WET) return '🔵 過湿';
  return '🟢 適正';
}

// ===== Main component =====

export function SoilSensor() {
  const { user, spreadsheetId, planters } = useAppStore();
  const [searchParams] = useSearchParams();
  const planterIdParam = searchParams.get('planterId');

  const [sensorData, setSensorData] = useState<SoilSensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('1w');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedPlanterId, setSelectedPlanterId] = useState<string>(
    planterIdParam ?? '',
  );

  // Fetch sensor data
  useEffect(() => {
    if (!user?.accessToken || !spreadsheetId) return;
    setLoading(true);
    setError(null);

    withAuthRetry((token) => getSoilSensorData(spreadsheetId, token))
      .then((rows) => {
        const data = rows
          .map(rowToSoilSensorData)
          .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
        setSensorData(data);

        // Auto-select first planter that has data
        if (!selectedPlanterId && data.length > 0) {
          setSelectedPlanterId(data[0].planterId);
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : '土壌センサーデータの取得に失敗しました',
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.accessToken, spreadsheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Planters that have sensor data
  const plantersWithData = useMemo(() => {
    const planterIds = new Set(sensorData.map((d) => d.planterId));
    return planters.filter((p) => planterIds.has(p.id));
  }, [sensorData, planters]);

  // Filter data by selected planter and period
  const filteredData = useMemo(() => {
    let data = sensorData;

    if (selectedPlanterId) {
      data = data.filter((d) => d.planterId === selectedPlanterId);
    }

    const startDate = getStartDate(period);
    if (startDate) {
      const startStr = startDate.toISOString();
      data = data.filter((d) => d.measuredAt >= startStr);
    }

    return data;
  }, [sensorData, selectedPlanterId, period]);

  // Chart data with formatted time labels
  const chartData = useMemo(() => {
    return filteredData.map((d) => {
      let timeLabel = d.measuredAt;
      try {
        const dt = parseISO(d.measuredAt);
        timeLabel =
          period === '1d'
            ? format(dt, 'H:mm')
            : format(dt, 'M/d H:mm');
      } catch {
        // keep original
      }
      return { ...d, timeLabel };
    });
  }, [filteredData, period]);

  // Latest reading
  const latestReading = useMemo(() => {
    if (filteredData.length === 0) return null;
    return filteredData[filteredData.length - 1];
  }, [filteredData]);

  // Stats
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const vwcs = filteredData.filter((d) => d.vwc != null).map((d) => d.vwc!);
    const temps = filteredData
      .filter((d) => d.soilTemp != null)
      .map((d) => d.soilTemp!);
    return {
      avgVwc:
        vwcs.length > 0
          ? (vwcs.reduce((a, b) => a + b, 0) / vwcs.length).toFixed(1)
          : '-',
      minVwc: vwcs.length > 0 ? Math.min(...vwcs).toFixed(1) : '-',
      maxVwc: vwcs.length > 0 ? Math.max(...vwcs).toFixed(1) : '-',
      avgTemp:
        temps.length > 0
          ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
          : '-',
      readings: filteredData.length,
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <span className="text-4xl animate-bounce">📡</span>
          <p className="mt-2 text-gray-500 animate-pulse">
            土壌センサーデータを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">🌱 土壌センサーデータ</h1>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (sensorData.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">🌱 土壌センサーデータ</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-4xl mb-4">📡</p>
          <p className="text-gray-500 text-sm">
            土壌センサーデータがまだありません
          </p>
          <p className="text-gray-400 text-xs mt-2">
            GAS Web App をデプロイして土壌センサーからのデータ送信を設定してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🌱 土壌センサーデータ</h1>

      {/* Planter selector */}
      {plantersWithData.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {plantersWithData.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlanterId(p.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm transition-colors',
                selectedPlanterId === p.id
                  ? 'bg-garden-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
              )}
            >
              {p.cropName || p.name}
            </button>
          ))}
        </div>
      )}

      {/* Latest reading summary */}
      {latestReading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Droplets size={18} className="text-blue-500" />}
            label="VWC（体積含水率）"
            value={latestReading.vwc ?? '-'}
            unit="%"
            color="bg-blue-50 dark:bg-blue-900/20"
            status={getVwcStatus(latestReading.vwc)}
          />
          <StatCard
            icon={<Thermometer size={18} className="text-orange-500" />}
            label="地温"
            value={latestReading.soilTemp ?? '-'}
            unit="℃"
            color="bg-orange-50 dark:bg-orange-900/20"
          />
          <StatCard
            icon={<Zap size={18} className="text-yellow-500" />}
            label="EC Bulk"
            value={latestReading.ecBulk ?? '-'}
            unit="dS/m"
            color="bg-yellow-50 dark:bg-yellow-900/20"
          />
          <StatCard
            icon={<Zap size={18} className="text-purple-500" />}
            label="EC Pore"
            value={latestReading.ecPore ?? '-'}
            unit="dS/m"
            color="bg-purple-50 dark:bg-purple-900/20"
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

      {/* Stats */}
      {stats && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>📊 {stats.readings}件</span>
          <span>💧 平均VWC {stats.avgVwc}%</span>
          <span>
            📉 {stats.minVwc}% ～ {stats.maxVwc}%
          </span>
          <span>🌡️ 平均地温 {stats.avgTemp}℃</span>
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
                VWC・地温
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="vwc"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: 'VWC %',
                      position: 'insideTopLeft',
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="temp"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: '℃',
                      position: 'insideTopRight',
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    yAxisId="vwc"
                    y={VWC_DRY}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: '乾燥', fontSize: 10, fill: '#ef4444' }}
                  />
                  <ReferenceLine
                    yAxisId="vwc"
                    y={VWC_WET}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    label={{ value: '過湿', fontSize: 10, fill: '#3b82f6' }}
                  />
                  <Area
                    yAxisId="vwc"
                    type="monotone"
                    dataKey="vwc"
                    name="VWC"
                    stroke="#3b82f6"
                    fill="#bfdbfe"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="soilTemp"
                    name="地温"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'vwc' && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              体積含水率 (VWC) 推移
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, 60]}
                  label={{
                    value: '%',
                    position: 'insideTopLeft',
                    offset: -5,
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={VWC_DRY}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: `乾燥 (${VWC_DRY}%)`,
                    fontSize: 10,
                    fill: '#ef4444',
                  }}
                />
                <ReferenceLine
                  y={VWC_WET}
                  stroke="#3b82f6"
                  strokeDasharray="3 3"
                  label={{
                    value: `過湿 (${VWC_WET}%)`,
                    fontSize: 10,
                    fill: '#3b82f6',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vwc"
                  name="VWC"
                  stroke="#3b82f6"
                  fill="#bfdbfe"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'soilTemp' && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              地温推移
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10 }}
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
                  dataKey="soilTemp"
                  name="地温"
                  stroke="#f59e0b"
                  fill="#fde68a"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'ec' && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              EC（電気伝導度）推移
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'dS/m',
                    position: 'insideTopLeft',
                    offset: -5,
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="ecBulk"
                  name="EC Bulk"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ecPore"
                  name="EC Pore"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent data table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 p-3 border-b border-gray-200 dark:border-gray-700">
          直近の計測データ
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                <th className="px-3 py-2 font-medium">日時</th>
                <th className="px-3 py-2 font-medium text-right">VWC %</th>
                <th className="px-3 py-2 font-medium text-right">地温 ℃</th>
                <th className="px-3 py-2 font-medium text-right">EC Bulk</th>
                <th className="px-3 py-2 font-medium text-right hidden md:table-cell">
                  EC Pore
                </th>
              </tr>
            </thead>
            <tbody>
              {[...filteredData]
                .reverse()
                .slice(0, 15)
                .map((d) => {
                  let displayTime = d.measuredAt;
                  try {
                    displayTime = format(
                      parseISO(d.measuredAt),
                      'M/d HH:mm',
                    );
                  } catch {
                    // keep original
                  }
                  return (
                    <tr
                      key={d.id}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-3 py-2">{displayTime}</td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                        {d.vwc ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-600 dark:text-orange-400">
                        {d.soilTemp ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {d.ecBulk ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-right hidden md:table-cell">
                        {d.ecPore ?? '-'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
