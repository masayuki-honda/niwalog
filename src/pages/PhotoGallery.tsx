export function PhotoGallery() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📸 フォトギャラリー</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-4xl mb-4">🖼️</p>
        <p className="text-gray-500 text-sm">
          フォトギャラリー機能は Phase 2 で実装予定です
        </p>
        <p className="text-gray-400 text-xs mt-2">
          アクティビティに紐づけた写真を一覧で閲覧・管理できます
        </p>
      </div>
    </div>
  );
}
