import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Droplets, Scissors, Sprout, ImageIcon, Thermometer, Sun, Cloud, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { ACTIVITY_TYPE_CONFIG } from '@/constants';
import { formatDate, daysSince } from '@/utils';
import { getWeatherData, getSettings } from '@/services/sheets-api';
import { fetchWeatherForecast, generateWorkAdvices, weatherCodeToInfo, type WeatherForecast, type WorkAdvice } from '@/services/weather-forecast';
import { withAuthRetry } from '@/utils/auth-retry';
import { format, parseISO, ja } from '@/utils/date-imports';
import type { WeatherData } from '@/types';

interface SuggestedTask {
  planterId: string;
  cropName: string;
  activityType: string;
  emoji: string;
  label: string;
  reason: string;
  daysSinceLast: number;
}

export function Dashboard() {
  const { planters, activities, spreadsheetId, user } = useAppStore();
  const [todayWeather, setTodayWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [workAdvices, setWorkAdvices] = useState<WorkAdvice[]>([]);

  const activePlanters = planters.filter((p) => p.status === 'active');
  const recentActivities = activities.slice(0, 5);

  // Fetch latest weather data
  useEffect(() => {
    if (!user?.accessToken || !spreadsheetId) return;
    withAuthRetry((token) => getWeatherData(spreadsheetId, token))
      .then((rows) => {
        if (rows.length === 0) return;
        // Get the latest row
        const lastRow = rows[rows.length - 1];
        setTodayWeather({
          date: lastRow[0] ?? '',
          tempMax: lastRow[1] ? Number(lastRow[1]) : null,
          tempMin: lastRow[2] ? Number(lastRow[2]) : null,
          tempAvg: lastRow[3] ? Number(lastRow[3]) : null,
          precipitation: lastRow[4] ? Number(lastRow[4]) : null,
          solarRadiation: lastRow[5] ? Number(lastRow[5]) : null,
          humidityAvg: lastRow[6] ? Number(lastRow[6]) : null,
          windSpeedMax: lastRow[7] ? Number(lastRow[7]) : null,
          source: lastRow[8] ?? '',
          fetchedAt: lastRow[9] ?? '',
        });
      })
      .catch(() => {
        // Silently fail - weather section just won't show
      });
  }, [user?.accessToken, spreadsheetId]);

  // Fetch 7-day forecast + work advices
  useEffect(() => {
    if (!user?.accessToken || !spreadsheetId) return;
    withAuthRetry((token) => getSettings(spreadsheetId, token))
      .then(async (settings) => {
        const lat = settings.latitude;
        const lon = settings.longitude;
        if (!lat || !lon) return;
        const fc = await fetchWeatherForecast(lat, lon);
        setForecast(fc);
        setWorkAdvices(generateWorkAdvices(fc));
      })
      .catch(() => {
        // Silently fail
      });
  }, [user?.accessToken, spreadsheetId]);

  // Harvest summary for current month
  const now = new Date();
  const currentMonthActivities = activities.filter((a) => {
    if (a.activityType !== 'harvest' || !a.activityDate) return false;
    const d = new Date(a.activityDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const harvestByPlanter = new Map<string, { cropName: string; total: number; unit: string }>();
  currentMonthActivities.forEach((a) => {
    const planter = planters.find((p) => p.id === a.planterId);
    if (!planter || !a.quantity) return;
    const key = a.planterId;
    const existing = harvestByPlanter.get(key);
    if (existing) {
      existing.total += a.quantity;
    } else {
      harvestByPlanter.set(key, {
        cropName: planter.cropName,
        total: a.quantity,
        unit: a.unit || 'g',
      });
    }
  });

  // ======= 今日やることリスト (F-future-02) =======
  const suggestedTasks = useMemo<SuggestedTask[]>(() => {
    if (activePlanters.length === 0) return [];
    const tasks: SuggestedTask[] = [];
    const today = new Date();

    for (const p of activePlanters) {
      const pActivities = activities.filter((a) => a.planterId === p.id);

      // 水やりチェック: 最後の水やりから2日以上
      const lastWatering = pActivities
        .filter((a) => a.activityType === 'watering')
        .sort((a, b) => b.activityDate.localeCompare(a.activityDate))[0];
      const daysSinceWatering = lastWatering
        ? Math.floor((today.getTime() - new Date(lastWatering.activityDate).getTime()) / 86400000)
        : 999;
      if (daysSinceWatering >= 2) {
        tasks.push({
          planterId: p.id,
          cropName: p.cropName,
          activityType: 'watering',
          emoji: '💧',
          label: '水やり',
          reason: lastWatering ? `${daysSinceWatering}日前が最後` : '記録なし',
          daysSinceLast: daysSinceWatering,
        });
      }

      // 観察チェック: 最後の観察から7日以上
      const lastObservation = pActivities
        .filter((a) => a.activityType === 'observation')
        .sort((a, b) => b.activityDate.localeCompare(a.activityDate))[0];
      const daysSinceObs = lastObservation
        ? Math.floor((today.getTime() - new Date(lastObservation.activityDate).getTime()) / 86400000)
        : 999;
      if (daysSinceObs >= 7) {
        tasks.push({
          planterId: p.id,
          cropName: p.cropName,
          activityType: 'observation',
          emoji: '📸',
          label: '観察',
          reason: lastObservation ? `${daysSinceObs}日前が最後` : '記録なし',
          daysSinceLast: daysSinceObs,
        });
      }

      // 施肥チェック: 最後の施肥から14日以上
      const lastFertilizing = pActivities
        .filter((a) => a.activityType === 'fertilizing')
        .sort((a, b) => b.activityDate.localeCompare(a.activityDate))[0];
      const daysSinceFert = lastFertilizing
        ? Math.floor((today.getTime() - new Date(lastFertilizing.activityDate).getTime()) / 86400000)
        : 999;
      if (daysSinceFert >= 14 && daysSinceFert < 999) {
        tasks.push({
          planterId: p.id,
          cropName: p.cropName,
          activityType: 'fertilizing',
          emoji: '🧪',
          label: '施肥',
          reason: `${daysSinceFert}日前が最後`,
          daysSinceLast: daysSinceFert,
        });
      }
    }

    // 緊急度でソート（日数長い順）
    tasks.sort((a, b) => b.daysSinceLast - a.daysSinceLast);
    return tasks.slice(0, 8);
  }, [activePlanters, activities]);

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  if (!spreadsheetId) {
    return (
      <div className="text-center py-12">
        <span className="text-5xl">⚙️</span>
        <h2 className="text-xl font-bold mt-4">初期設定が必要です</h2>
        <p className="text-gray-500 mt-2">
          設定ページでスプレッドシートIDを入力してください
        </p>
        <Link
          to="/settings"
          className="inline-block mt-4 px-6 py-2 bg-garden-600 text-white rounded-lg hover:bg-garden-700"
        >
          設定を開く
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date */}
      <div>
        <h1 className="text-lg font-bold">
          📅 {formatDate(now.toISOString(), 'yyyy年M月d日(E)')}
        </h1>
      </div>

      {/* Weather summary */}
      {todayWeather && (
        <Link
          to="/weather"
          className="block bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-100 dark:border-blue-800 p-3 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud size={20} className="text-blue-500" />
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Thermometer size={14} className="text-red-500" />
                    {todayWeather.tempMax ?? '-'}℃
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    {todayWeather.tempMin ?? '-'}℃
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span>
                    <Droplets size={12} className="inline mr-0.5" />
                    {todayWeather.precipitation ?? 0}mm
                  </span>
                  <span>
                    <Sun size={12} className="inline mr-0.5" />
                    {todayWeather.solarRadiation ?? '-'} MJ/m²
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400">{todayWeather.date}</span>
          </div>
        </Link>
      )}

      {/* Work Advices from forecast */}
      {workAdvices.length > 0 && (
        <section className="space-y-2">
          {workAdvices.map((advice, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                advice.priority === 'high'
                  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  : advice.priority === 'medium'
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                    : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              }`}
            >
              <span className="text-xl shrink-0">{advice.emoji}</span>
              <div>
                <p className="font-medium">{advice.title}</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{advice.description}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 7-day Forecast */}
      {forecast && forecast.days.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm">7日間予報</h2>
            <Link to="/weather" className="text-xs text-garden-600 dark:text-garden-400 hover:underline flex items-center gap-0.5">
              詳細 <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {forecast.days.map((day) => {
              const info = weatherCodeToInfo(day.weatherCode);
              const dateObj = parseISO(day.date);
              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center px-2.5 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 min-w-[64px] text-xs"
                >
                  <span className="text-gray-500">{format(dateObj, 'M/d(E)', { locale: ja })}</span>
                  <span className="text-lg my-0.5">{info.emoji}</span>
                  <span className="text-red-500 font-medium">{Math.round(day.tempMax)}°</span>
                  <span className="text-blue-500">{Math.round(day.tempMin)}°</span>
                  {day.precipitationProbability > 0 && (
                    <span className="text-blue-400 mt-0.5">{day.precipitationProbability}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Link
          to="/activities/new?type=watering"
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm whitespace-nowrap hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          <Droplets size={16} /> 水やり
        </Link>
        <Link
          to="/activities/new?type=harvest"
          className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm whitespace-nowrap hover:bg-green-100 dark:hover:bg-green-900/50"
        >
          <Sprout size={16} /> 収穫
        </Link>
        <Link
          to="/activities/new?type=pruning"
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm whitespace-nowrap hover:bg-purple-100 dark:hover:bg-purple-900/50"
        >
          <Scissors size={16} /> 剪定
        </Link>
        <Link
          to="/activities/new"
          className="flex items-center gap-2 px-4 py-2 bg-garden-50 dark:bg-garden-900/30 text-garden-700 dark:text-garden-300 rounded-full text-sm whitespace-nowrap hover:bg-garden-100 dark:hover:bg-garden-900/50"
        >
          <PlusCircle size={16} /> その他
        </Link>
      </div>

      {/* 今日やること (F-future-02) */}
      {suggestedTasks.length > 0 && (
        <section>
          <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-2">
            📋 今日やること
          </h2>
          <div className="space-y-1.5">
            {suggestedTasks
              .filter((t) => !completedTasks.has(`${t.planterId}-${t.activityType}`))
              .map((task) => {
                const taskKey = `${task.planterId}-${task.activityType}`;
                return (
                  <div
                    key={taskKey}
                    className="flex items-center gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                  >
                    <button
                      onClick={() => setCompletedTasks((prev) => new Set(prev).add(taskKey))}
                      className="shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-garden-500 dark:hover:border-garden-400 flex items-center justify-center transition-colors"
                      title="完了にする"
                    >
                    </button>
                    <span className="text-lg shrink-0">{task.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {task.cropName} — {task.label}
                      </div>
                      <div className="text-xs text-gray-500">{task.reason}</div>
                    </div>
                    <Link
                      to={`/activities/new?planterId=${task.planterId}&type=${task.activityType}`}
                      className="shrink-0 text-xs px-2.5 py-1 bg-garden-50 dark:bg-garden-900/30 text-garden-700 dark:text-garden-400 rounded-full hover:bg-garden-100 dark:hover:bg-garden-900/50"
                    >
                      記録
                    </Link>
                  </div>
                );
              })}
            {suggestedTasks.length > 0 && completedTasks.size > 0 && completedTasks.size < suggestedTasks.length && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-500" />
                {completedTasks.size}件完了
              </p>
            )}
            {completedTasks.size >= suggestedTasks.length && suggestedTasks.length > 0 && (
              <p className="text-center text-sm text-green-600 dark:text-green-400 py-2">
                🎉 全タスク完了！お疲れさまでした
              </p>
            )}
          </div>
        </section>
      )}

      {/* Recent Activities */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700 dark:text-gray-300">
            最近の作業
          </h2>
          <Link
            to="/activities/new"
            className="text-sm text-garden-600 dark:text-garden-400 hover:underline"
          >
            + 記録する
          </Link>
        </div>
        {recentActivities.length === 0 ? (
          <p className="text-gray-400 text-sm">まだ作業記録がありません</p>
        ) : (
          <div className="space-y-2">
            {recentActivities.map((activity) => {
              const config = ACTIVITY_TYPE_CONFIG[activity.activityType];
              const planter = planters.find(
                (p) => p.id === activity.planterId,
              );
              return (
                <Link
                  key={activity.id}
                  to={`/planters/${activity.planterId}`}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm"
                >
                  <span
                    className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full ${config.color}`}
                  >
                    {config.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{config.label}</span>
                      {activity.quantity && (
                        <span className="text-gray-500">
                          {activity.quantity}
                          {activity.unit}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {planter?.cropName ?? '不明'}{' '}
                      {activity.memo && `- ${activity.memo}`}
                      {activity.photoFileIds?.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 ml-1 text-gray-400">
                          <ImageIcon size={10} /> {activity.photoFileIds.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {activity.activityDate &&
                      formatDate(activity.activityDate, 'M/d')}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Planters */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700 dark:text-gray-300">
            プランター
          </h2>
          <Link
            to="/planters"
            className="text-sm text-garden-600 dark:text-garden-400 hover:underline"
          >
            一覧を見る →
          </Link>
        </div>
        {activePlanters.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              プランターを登録してください
            </p>
            <Link
              to="/planters?new=1"
              className="inline-block mt-2 px-4 py-2 bg-garden-600 text-white rounded-lg text-sm hover:bg-garden-700"
            >
              + プランター追加
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {activePlanters.slice(0, 6).map((planter) => (
              <Link
                key={planter.id}
                to={`/planters/${planter.id}`}
                className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm"
              >
                <div className="text-sm font-medium truncate">
                  {planter.cropName}
                </div>
                {planter.cropVariety && (
                  <div className="text-xs text-gray-400 truncate">
                    {planter.cropVariety}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {planter.startDate
                    ? `${daysSince(planter.startDate)}日目`
                    : '未開始'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Harvest Summary */}
      {harvestByPlanter.size > 0 && (
        <section>
          <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-3">
            収穫サマリー（今月）
          </h2>
          <div className="space-y-2">
            {Array.from(harvestByPlanter.values()).map((harvest, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{harvest.cropName}</span>
                    <span className="font-medium">
                      {harvest.total} {harvest.unit}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-garden-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          (harvest.total /
                            Math.max(
                              ...Array.from(harvestByPlanter.values()).map(
                                (h) => h.total,
                              ),
                            )) *
                            100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
