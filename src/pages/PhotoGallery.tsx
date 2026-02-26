import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Filter, X, Columns2, ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { DriveImage } from '@/components/DriveImage';
import { ACTIVITY_TYPE_CONFIG } from '@/constants';
import { format, parseISO, ja } from '@/utils/date-imports';
import { cn, parsePhotoIds } from '@/utils';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface PhotoEntry {
  fileId: string;
  activityId: string;
  planterId: string;
  planterName: string;
  cropName: string;
  activityType: string;
  activityDate: string;
  memo: string;
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export function PhotoGallery() {
  const { planters, activities } = useAppStore();

  /* ---------- state ---------- */
  const [filterPlanterId, setFilterPlanterId] = useState<string>('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<[string | null, string | null]>([null, null]);
  const [filterOpen, setFilterOpen] = useState(false);

  /* ---------- build flat photo list ---------- */
  const planterMap = useMemo(() => {
    const m = new Map<string, { name: string; cropName: string }>();
    for (const p of planters) {
      m.set(p.id, { name: p.name, cropName: p.cropName });
    }
    return m;
  }, [planters]);

  const allPhotos = useMemo<PhotoEntry[]>(() => {
    const list: PhotoEntry[] = [];
    for (const act of activities) {
      const ids = parsePhotoIds(
        Array.isArray(act.photoFileIds)
          ? act.photoFileIds.join(',')
          : (act.photoFileIds as unknown as string) ?? '',
      );
      if (ids.length === 0) continue;

      const pi = planterMap.get(act.planterId);
      for (const fileId of ids) {
        list.push({
          fileId,
          activityId: act.id,
          planterId: act.planterId,
          planterName: pi?.name ?? '不明',
          cropName: pi?.cropName ?? '',
          activityType: act.activityType,
          activityDate: act.activityDate,
          memo: act.memo,
        });
      }
    }
    // newest first
    list.sort((a, b) => b.activityDate.localeCompare(a.activityDate));
    return list;
  }, [activities, planterMap]);

  /* ---------- filtered ---------- */
  const photos = useMemo(
    () => (filterPlanterId ? allPhotos.filter((p) => p.planterId === filterPlanterId) : allPhotos),
    [allPhotos, filterPlanterId],
  );

  /* ---------- group by month ---------- */
  const grouped = useMemo(() => {
    const map = new Map<string, PhotoEntry[]>();
    for (const p of photos) {
      let key: string;
      try {
        key = format(parseISO(p.activityDate), 'yyyy年M月', { locale: ja });
      } catch {
        key = '日付不明';
      }
      const arr = map.get(key);
      if (arr) arr.push(p);
      else map.set(key, [p]);
    }
    return Array.from(map.entries());
  }, [photos]);

  /* ---------- planters with photos (for filter list) ---------- */
  const plantersWithPhotos = useMemo(() => {
    const ids = new Set(allPhotos.map((p) => p.planterId));
    return planters.filter((p) => ids.has(p.id));
  }, [allPhotos, planters]);

  /* ---------- lightbox nav ---------- */
  const openLightbox = useCallback((idx: number) => setLightboxIndex(idx), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevPhoto = useCallback(
    () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i)),
    [],
  );
  const nextPhoto = useCallback(
    () => setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i)),
    [],
  );

  /* ---------- compare helpers ---------- */
  const toggleCompareSelect = useCallback(
    (fileId: string) => {
      setCompareSelection(([a, b]) => {
        if (a === fileId) return [b, null];
        if (b === fileId) return [a, null];
        if (!a) return [fileId, null];
        if (!b) return [a, fileId];
        return [fileId, null]; // reset – start new pair
      });
    },
    [],
  );

  const exitCompare = useCallback(() => {
    setCompareMode(false);
    setCompareSelection([null, null]);
  }, []);

  const comparePhotos = useMemo(() => {
    const [a, b] = compareSelection;
    return [
      a ? photos.find((p) => p.fileId === a) ?? null : null,
      b ? photos.find((p) => p.fileId === b) ?? null : null,
    ] as const;
  }, [compareSelection, photos]);

  /* ---------- format helpers ---------- */
  const fmtDate = (d: string) => {
    try {
      return format(parseISO(d), 'M/d(E)', { locale: ja });
    } catch {
      return d;
    }
  };

  const actLabel = (type: string) => {
    const cfg = ACTIVITY_TYPE_CONFIG[type as keyof typeof ACTIVITY_TYPE_CONFIG];
    return cfg ? `${cfg.emoji} ${cfg.label}` : type;
  };

  /* ────────────────────────────────────────── */
  /*  RENDER                                    */
  /* ────────────────────────────────────────── */

  // Empty state
  if (allPhotos.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">📸 フォトギャラリー</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-4xl mb-4">🖼️</p>
          <p className="text-gray-500 text-sm">写真がまだありません</p>
          <p className="text-gray-400 text-xs mt-2">
            アクティビティ記録時に写真を添付すると、ここに表示されます
          </p>
          <Link
            to="/activities/new"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-garden-600 text-white text-sm hover:bg-garden-700 transition"
          >
            <Camera size={16} />
            記録する
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📸 フォトギャラリー</h1>
        <div className="flex items-center gap-2">
          {/* Compare mode toggle */}
          <button
            onClick={() => (compareMode ? exitCompare() : setCompareMode(true))}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition',
              compareMode
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
            )}
          >
            <Columns2 size={14} />
            比較
          </button>

          {/* Filter toggle */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition',
                filterPlanterId
                  ? 'bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
              )}
            >
              <Filter size={14} />
              絞込
              <ChevronDown size={12} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 py-1">
                <button
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                    !filterPlanterId && 'font-bold text-garden-600',
                  )}
                  onClick={() => {
                    setFilterPlanterId('');
                    setFilterOpen(false);
                  }}
                >
                  すべて ({allPhotos.length}枚)
                </button>
                {plantersWithPhotos.map((p) => {
                  const count = allPhotos.filter((ph) => ph.planterId === p.id).length;
                  return (
                    <button
                      key={p.id}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 truncate',
                        filterPlanterId === p.id && 'font-bold text-garden-600',
                      )}
                      onClick={() => {
                        setFilterPlanterId(p.id);
                        setFilterOpen(false);
                      }}
                    >
                      {p.cropName} ({p.name}) — {count}枚
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active filter chip */}
      {filterPlanterId && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-garden-100 dark:bg-garden-900/40 text-garden-700 dark:text-garden-300 text-xs">
            {planterMap.get(filterPlanterId)?.cropName ?? ''}
            <button onClick={() => setFilterPlanterId('')} className="hover:text-garden-900">
              <X size={12} />
            </button>
          </span>
          <span className="text-xs text-gray-400">{photos.length}枚</span>
        </div>
      )}

      {/* Compare mode bar */}
      {compareMode && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
          <p className="text-xs text-indigo-600 dark:text-indigo-300 mb-2">
            比較する写真を2枚選んでください
          </p>

          {comparePhotos[0] && comparePhotos[1] && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {comparePhotos.map((cp, i) =>
                cp ? (
                  <div key={i} className="space-y-1">
                    <DriveImage
                      fileId={cp.fileId}
                      alt={cp.cropName}
                      className="w-full aspect-square rounded-lg object-cover"
                    />
                    <div className="text-xs text-center text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{cp.cropName}</span>
                      <span className="mx-1">·</span>
                      <span>{fmtDate(cp.activityDate)}</span>
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {compareSelection[0] ? '1枚目 ✓' : '1枚目 …'}
              {' / '}
              {compareSelection[1] ? '2枚目 ✓' : '2枚目 …'}
            </span>
            <button
              onClick={exitCompare}
              className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              比較を終了
            </button>
          </div>
        </div>
      )}

      {/* Photo timeline */}
      {grouped.map(([monthLabel, monthPhotos]) => (
        <section key={monthLabel}>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{monthLabel}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
            {monthPhotos.map((p, idx) => {
              const globalIdx = photos.indexOf(p);
              const isCompareSelected = compareSelection.includes(p.fileId);

              return (
                <div
                  key={`${p.fileId}-${idx}`}
                  className={cn(
                    'relative group cursor-pointer rounded-lg overflow-hidden aspect-square',
                    isCompareSelected && 'ring-2 ring-indigo-500',
                  )}
                  onClick={() =>
                    compareMode ? toggleCompareSelect(p.fileId) : openLightbox(globalIdx)
                  }
                >
                  <DriveImage
                    fileId={p.fileId}
                    alt={p.cropName}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-end">
                    <div className="w-full p-1.5 text-white text-[10px] leading-tight opacity-0 group-hover:opacity-100 transition">
                      <div className="font-medium truncate">{p.cropName}</div>
                      <div className="flex items-center gap-1">
                        <span>{fmtDate(p.activityDate)}</span>
                        <span>{actLabel(p.activityType)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compare badge */}
                  {compareMode && isCompareSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">
                      {compareSelection[0] === p.fileId ? '1' : '2'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* No results after filter */}
      {photos.length === 0 && filterPlanterId && (
        <div className="text-center py-8 text-gray-400 text-sm">
          このプランターには写真がありません
        </div>
      )}

      {/* ─── Lightbox ─── */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm">
              <span className="font-medium">{photos[lightboxIndex].cropName}</span>
              <span className="mx-2 opacity-60">·</span>
              <span className="opacity-80">{fmtDate(photos[lightboxIndex].activityDate)}</span>
              <span className="mx-2 opacity-60">·</span>
              <span className="opacity-80">{actLabel(photos[lightboxIndex].activityType)}</span>
            </div>
            <button onClick={closeLightbox} className="p-1 hover:bg-white/20 rounded-lg transition">
              <X size={20} />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center w-full px-12" onClick={(e) => e.stopPropagation()}>
            <DriveImage
              fileId={photos[lightboxIndex].fileId}
              alt={photos[lightboxIndex].cropName}
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
            />
          </div>

          {/* Nav arrows */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
            >
              <ArrowRight size={20} />
            </button>
          )}

          {/* Bottom info */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3 text-white text-center text-xs opacity-60"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxIndex + 1} / {photos.length}
            {photos[lightboxIndex].memo && (
              <span className="ml-3">{photos[lightboxIndex].memo}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
