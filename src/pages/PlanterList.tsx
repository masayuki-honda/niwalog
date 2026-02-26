import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { addPlanter as addPlanterToSheet } from '@/services/sheets-api';
import { withAuthRetry } from '@/utils/auth-retry';
import { generateId, nowISO, cn, daysSince } from '@/utils';
import { toast } from '@/stores/toast-store';
import type { Planter } from '@/types';

export function PlanterList() {
  const { user, spreadsheetId, planters, addPlanter, setError } = useAppStore();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [cropName, setCropName] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [memo, setMemo] = useState('');

  const filtered = planters.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !spreadsheetId || !cropName.trim()) return;

    setSaving(true);
    try {
      const id = generateId();
      const now = nowISO();
      const planter: Planter = {
        id,
        name: name.trim() || cropName.trim(),
        cropName: cropName.trim(),
        cropVariety: cropVariety.trim(),
        location: location.trim(),
        startDate,
        endDate: '',
        status: 'active',
        imageFolderId: '',
        memo: memo.trim(),
        createdAt: now,
        updatedAt: now,
      };

      const row = [
        planter.id,
        planter.name,
        planter.cropName,
        planter.cropVariety,
        planter.location,
        planter.startDate,
        planter.endDate,
        planter.status,
        planter.imageFolderId,
        planter.memo,
        planter.createdAt,
        planter.updatedAt,
      ];

      await withAuthRetry((token) => addPlanterToSheet(spreadsheetId, row, token));
      addPlanter(planter);
      toast.success(`${planter.cropName} を追加しました`);

      // Reset form
      setName('');
      setCropName('');
      setCropVariety('');
      setLocation('');
      setStartDate('');
      setMemo('');
      setShowForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存に失敗しました';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🌱 プランター</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-2 bg-garden-600 text-white rounded-lg text-sm hover:bg-garden-700"
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      {/* New planter form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
        >
          <h3 className="font-bold text-sm">新しいプランターを登録</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                作物名 *
              </label>
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="例: トマト"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">品種</label>
              <input
                type="text"
                value={cropVariety}
                onChange={(e) => setCropVariety(e.target.value)}
                placeholder="例: 桃太郎"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                プランター名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 庭A-1（空なら作物名を使用）"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">場所</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: ベランダ"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                栽培開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-garden-600 text-white rounded-lg hover:bg-garden-700 disabled:bg-gray-400"
            >
              {saving ? '保存中...' : '登録'}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        {(['active', 'archived', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded-full text-xs',
              filter === f
                ? 'bg-garden-100 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700',
            )}
          >
            {f === 'active' ? '栽培中' : f === 'archived' ? 'アーカイブ' : 'すべて'}
          </button>
        ))}
      </div>

      {/* Planter cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>プランターがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((planter) => (
            <Link
              key={planter.id}
              to={`/planters/${planter.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base">{planter.cropName}</h3>
                  {planter.cropVariety && (
                    <p className="text-xs text-gray-500">{planter.cropVariety}</p>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    planter.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {planter.status === 'active' ? '栽培中' : 'アーカイブ'}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                {planter.name !== planter.cropName && (
                  <p>📍 {planter.name}</p>
                )}
                {planter.location && <p>🏡 {planter.location}</p>}
                {planter.startDate && (
                  <p>🗓️ {daysSince(planter.startDate)}日目</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
