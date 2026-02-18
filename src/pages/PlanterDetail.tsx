import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Archive, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { updateRow, clearRow, findRowIndex } from '@/services/sheets-api';
import { SHEET_NAMES, ACTIVITY_TYPE_CONFIG } from '@/constants';
import { formatDate, cn, nowISO, daysSince } from '@/utils';
import type { Planter, ActivityLog } from '@/types';

export function PlanterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, spreadsheetId, planters, activities, setPlanters, setError } =
    useAppStore();
  const [tab, setTab] = useState<'timeline' | 'info'>('timeline');
  const [deleting, setDeleting] = useState(false);

  const planter = planters.find((p) => p.id === id);
  const planterActivities = activities
    .filter((a) => a.planterId === id)
    .sort(
      (a, b) =>
        new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime(),
    );

  if (!planter) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">プランターが見つかりません</p>
        <Link
          to="/planters"
          className="text-garden-600 underline text-sm mt-2 inline-block"
        >
          一覧に戻る
        </Link>
      </div>
    );
  }

  const handleArchiveToggle = async () => {
    if (!user || !spreadsheetId) return;
    try {
      const rowIndex = await findRowIndex(
        spreadsheetId,
        SHEET_NAMES.PLANTERS,
        planter.id,
        user.accessToken,
      );
      if (rowIndex < 0) return;

      const newStatus = planter.status === 'active' ? 'archived' : 'active';
      const now = nowISO();

      // Update status column (index 7) and updatedAt (index 11)
      const updatedPlanter: Planter = {
        ...planter,
        status: newStatus,
        endDate: newStatus === 'archived' ? now.split('T')[0] : '',
        updatedAt: now,
      };

      const row = [
        updatedPlanter.id,
        updatedPlanter.name,
        updatedPlanter.cropName,
        updatedPlanter.cropVariety,
        updatedPlanter.location,
        updatedPlanter.startDate,
        updatedPlanter.endDate,
        updatedPlanter.status,
        updatedPlanter.imageFolderId,
        updatedPlanter.memo,
        updatedPlanter.createdAt,
        updatedPlanter.updatedAt,
      ];

      await updateRow(
        spreadsheetId,
        SHEET_NAMES.PLANTERS,
        rowIndex,
        row,
        user.accessToken,
      );
      setPlanters(planters.map((p) => (p.id === id ? updatedPlanter : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!user || !spreadsheetId) return;
    if (!confirm('このプランターを削除しますか？関連するアクティビティも残ります。')) return;

    setDeleting(true);
    try {
      const rowIndex = await findRowIndex(
        spreadsheetId,
        SHEET_NAMES.PLANTERS,
        planter.id,
        user.accessToken,
      );
      if (rowIndex >= 0) {
        await clearRow(
          spreadsheetId,
          SHEET_NAMES.PLANTERS,
          rowIndex,
          user.accessToken,
        );
      }
      setPlanters(planters.filter((p) => p.id !== id));
      navigate('/planters');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/planters"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {planter.cropName}
            {planter.cropVariety && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({planter.cropVariety})
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500">{planter.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleArchiveToggle}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title={planter.status === 'active' ? 'アーカイブ' : '復元'}
          >
            {planter.status === 'active' ? (
              <Archive size={18} />
            ) : (
              <RotateCcw size={18} />
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            title="削除"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-4 text-sm">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs',
            planter.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500',
          )}
        >
          {planter.status === 'active' ? '栽培中' : 'アーカイブ'}
        </span>
        {planter.location && (
          <span className="text-gray-500">🏡 {planter.location}</span>
        )}
        {planter.startDate && (
          <span className="text-gray-500">🗓️ {daysSince(planter.startDate)}日目</span>
        )}
        <span className="text-gray-400 text-xs ml-auto">
          記録: {planterActivities.length}件
        </span>
      </div>

      {/* Quick action */}
      <Link
        to={`/activities/new?planterId=${planter.id}`}
        className="flex items-center justify-center gap-2 w-full py-2 bg-garden-600 text-white rounded-lg text-sm hover:bg-garden-700"
      >
        <Plus size={16} />
        アクティビティを記録
      </Link>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['timeline', 'info'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2',
              tab === t
                ? 'border-garden-600 text-garden-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'timeline' ? 'タイムライン' : '基本情報'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'timeline' ? (
        <Timeline activities={planterActivities} />
      ) : (
        <PlanterInfo planter={planter} />
      )}
    </div>
  );
}

function Timeline({ activities }: { activities: ActivityLog[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        まだアクティビティがありません
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-4">
        {activities.map((activity) => {
          const config = ACTIVITY_TYPE_CONFIG[activity.activityType];
          return (
            <div key={activity.id} className="relative pl-10">
              <div
                className={cn(
                  'absolute left-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
                  config?.color || 'bg-gray-400',
                )}
                style={{ top: '0.35rem' }}
              />
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>
                    {config?.emoji} {config?.label || activity.activityType}
                  </span>
                  <span>{formatDate(activity.activityDate)}</span>
                </div>
                {activity.memo && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {activity.memo}
                  </p>
                )}
                {activity.activityType === 'harvest' && activity.quantity && (
                  <p className="text-xs text-amber-600 mt-1">
                    🎯 収穫量: {activity.quantity}
                    {activity.unit || '個'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanterInfo({ planter }: { planter: Planter }) {
  const rows = [
    { label: 'プランター名', value: planter.name },
    { label: '作物名', value: planter.cropName },
    { label: '品種', value: planter.cropVariety },
    { label: '場所', value: planter.location },
    { label: '栽培開始日', value: planter.startDate },
    { label: '栽培終了日', value: planter.endDate },
    { label: 'ステータス', value: planter.status === 'active' ? '栽培中' : 'アーカイブ' },
    { label: 'メモ', value: planter.memo },
    { label: '作成日時', value: planter.createdAt ? formatDate(planter.createdAt) : '' },
    { label: '更新日時', value: planter.updatedAt ? formatDate(planter.updatedAt) : '' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
      {rows.map(
        (row) =>
          row.value && (
            <div key={row.label} className="flex px-4 py-3 text-sm">
              <span className="w-28 shrink-0 text-gray-500">{row.label}</span>
              <span className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {row.value}
              </span>
            </div>
          ),
      )}
    </div>
  );
}
