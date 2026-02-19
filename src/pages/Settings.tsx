import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { initializeSpreadsheet } from '@/services/sheets-api';
import { ensureAppFolder } from '@/services/drive-api';
import { withAuthRetry } from '@/utils/auth-retry';
import { Save, Loader2, ExternalLink, RefreshCw, Share2 } from 'lucide-react';

export function Settings() {
  const {
    user,
    googleClientId,
    spreadsheetId,
    driveFolderId,
    darkMode,
    setGoogleClientId,
    setSpreadsheetId,
    setDriveFolderId,
    setDarkMode,
    setError,
  } = useAppStore();

  const [localClientId, setLocalClientId] = useState(googleClientId);
  const [localSheetId, setLocalSheetId] = useState(spreadsheetId);
  const [localFolderId, setLocalFolderId] = useState(driveFolderId);
  const [initializing, setInitializing] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // 家族共有用ログインリンク（全設定を含む）
  const shareUrl = useMemo(() => {
    if (!localClientId.trim()) return '';
    const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const url = new URL(base);
    url.pathname = url.pathname.replace(/\/$/, '') + '/login';
    url.searchParams.set('clientId', localClientId.trim());
    if (localSheetId) url.searchParams.set('sheetId', localSheetId);
    if (localFolderId) url.searchParams.set('folderId', localFolderId);
    return url.toString();
  }, [localClientId, localSheetId, localFolderId]);

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleSave = () => {
    setGoogleClientId(localClientId);
    setSpreadsheetId(localSheetId);
    setDriveFolderId(localFolderId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleInitSheet = async () => {
    if (!user || !localSheetId) {
      setError('スプレッドシートIDを入力してください');
      return;
    }
    setInitializing(true);
    try {
      await withAuthRetry((token) => initializeSpreadsheet(localSheetId, token));
      setSpreadsheetId(localSheetId);
      alert('スプレッドシートの初期化が完了しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '初期化に失敗しました');
    } finally {
      setInitializing(false);
    }
  };

  const handleCreateDriveFolder = async () => {
    if (!user) return;
    setCreatingFolder(true);
    try {
      const folderId = await withAuthRetry((token) => ensureAppFolder(token));
      setLocalFolderId(folderId);
      setDriveFolderId(folderId);
      alert(`フォルダが作成されました: ${folderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フォルダ作成に失敗しました');
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">⚙️ 設定</h1>

      {/* Google Client ID */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-bold text-sm">Google OAuth Client ID</h2>
        <p className="text-xs text-gray-500">
          Google Cloud Console で取得した OAuth 2.0 クライアントIDを設定します。
        </p>
        <input
          type="text"
          value={localClientId}
          onChange={(e) => setLocalClientId(e.target.value)}
          placeholder="xxxx.apps.googleusercontent.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500 font-mono"
        />
      </section>

      {/* Spreadsheet ID */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-bold text-sm">Google スプレッドシート ID</h2>
        <p className="text-xs text-gray-500">
          データ保存先のスプレッドシートIDです。スプレッドシートのURLの <code>/d/</code> と <code>/edit</code> の間の部分です。
        </p>
        <input
          type="text"
          value={localSheetId}
          onChange={(e) => setLocalSheetId(e.target.value)}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500 font-mono"
        />
        <div className="flex gap-2">
          <button
            onClick={handleInitSheet}
            disabled={initializing || !localSheetId || !user}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {initializing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            シートを初期化
          </button>
          {localSheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${localSheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink size={12} />
              スプレッドシートを開く
            </a>
          )}
        </div>
      </section>

      {/* Drive folder */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-bold text-sm">Google Drive フォルダ ID</h2>
        <p className="text-xs text-gray-500">
          写真の保存先ルートフォルダです。プランター別のサブフォルダは写真アップロード時に自動作成されます。
        </p>
        <input
          type="text"
          value={localFolderId}
          onChange={(e) => setLocalFolderId(e.target.value)}
          placeholder="自動作成されます"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500 font-mono"
        />
        <button
          onClick={handleCreateDriveFolder}
          disabled={creatingFolder || !user}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {creatingFolder ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          フォルダを自動作成
        </button>
      </section>

      {/* Share link */}
      {localClientId.trim() && (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4 space-y-3">
          <h2 className="font-bold text-sm">📤 家族にアプリを共有</h2>
          <p className="text-xs text-gray-500">
            以下のリンクを LINE 等で家族に送ると、全設定が反映された状態でログインできます。
            事前に GCP のテストユーザーに家族の Gmail を追加してください。
          </p>
          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs font-mono break-all text-gray-600 dark:text-gray-300">
            {shareUrl}
          </div>
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Share2 size={12} />
            {shareCopied ? '✅ コピーしました！' : 'リンクをコピー'}
          </button>
        </section>
      )}

      {/* Display settings */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-bold text-sm">表示設定</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            className="w-4 h-4 accent-garden-600"
          />
          <span className="text-sm">ダークモード</span>
        </label>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full py-3 bg-garden-600 text-white rounded-lg font-medium hover:bg-garden-700 flex items-center justify-center gap-2"
      >
        <Save size={16} />
        {saved ? '✅ 保存しました' : '設定を保存'}
      </button>

      {/* App info */}
      <div className="text-center text-xs text-gray-400 pb-4">
        <p>🌱 家庭菜園ダイアリー v0.1.0</p>
        <p className="mt-1">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
