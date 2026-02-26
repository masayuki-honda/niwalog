/**
 * 汎用スケルトンコンポーネント
 * ページ読み込み中のプレースホルダー表示に使用
 */

function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
    />
  );
}

/** ダッシュボード風スケルトン */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Date */}
      <Bone className="h-6 w-48" />

      {/* Weather card */}
      <Bone className="h-16 w-full rounded-lg" />

      {/* Quick actions */}
      <div className="flex gap-2">
        <Bone className="h-10 w-24 rounded-full" />
        <Bone className="h-10 w-24 rounded-full" />
        <Bone className="h-10 w-24 rounded-full" />
        <Bone className="h-10 w-20 rounded-full" />
      </div>

      {/* Section */}
      <div className="space-y-2">
        <Bone className="h-5 w-32" />
        {[1, 2, 3].map((i) => (
          <Bone key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>

      {/* Planters grid */}
      <div className="space-y-2">
        <Bone className="h-5 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Bone key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** リスト表示スケルトン */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-40" />
        <Bone className="h-9 w-20 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }, (_, i) => (
          <Bone key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** チャート付きページスケルトン */
export function ChartPageSkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-7 w-48" />
      {/* Tab bar */}
      <div className="flex gap-2">
        <Bone className="h-9 w-16 rounded-lg" />
        <Bone className="h-9 w-16 rounded-lg" />
        <Bone className="h-9 w-16 rounded-lg" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      {/* Chart area */}
      <Bone className="h-64 w-full rounded-lg" />
    </div>
  );
}

/** 汎用ページスケルトン */
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Bone className="h-7 w-48" />
      <Bone className="h-4 w-full" />
      <Bone className="h-4 w-3/4" />
      <Bone className="h-40 w-full rounded-lg mt-4" />
      <Bone className="h-4 w-full" />
      <Bone className="h-4 w-2/3" />
    </div>
  );
}
