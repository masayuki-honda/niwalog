export function Review() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📋 振り返り</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-4xl mb-4">📝</p>
        <p className="text-gray-500 text-sm">
          振り返り機能は Phase 4 で実装予定です
        </p>
        <p className="text-gray-400 text-xs mt-2">
          シーズンごとの栽培記録を振り返り、次の栽培に活かすメモを残せます
        </p>
      </div>
    </div>
  );
}
