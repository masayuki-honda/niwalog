import { Link } from 'react-router-dom';
import { PlusCircle, Droplets, Scissors, Sprout } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { ACTIVITY_TYPE_CONFIG } from '@/constants';
import { formatDate, daysSince } from '@/utils';

export function Dashboard() {
  const { planters, activities, spreadsheetId } = useAppStore();

  const activePlanters = planters.filter((p) => p.status === 'active');
  const recentActivities = activities.slice(0, 5);

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
