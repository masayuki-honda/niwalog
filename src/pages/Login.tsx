import { useAppStore } from '@/stores/app-store';
import { loadGapiClient, loadGisClient, requestAccessToken, getUserInfo } from '@/services/google-auth';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function Login() {
  const { googleClientId, setGoogleClientId, setUser, setError } = useAppStore();
  const user = useAppStore((s) => s.user);
  const error = useAppStore((s) => s.error);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL パラメータの clientId を優先し、なければストアの値を使う
  const urlClientId = searchParams.get('clientId') ?? '';
  const initialClientId = urlClientId || googleClientId;
  const [clientIdInput, setClientIdInput] = useState(initialClientId);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // URL パラメータで clientId が渡された場合はストアにも保存
  useEffect(() => {
    if (urlClientId && urlClientId !== googleClientId) {
      setGoogleClientId(urlClientId);
      setClientIdInput(urlClientId);
    }
  }, [urlClientId, googleClientId, setGoogleClientId]);

  // 家族共有用: URLパラメータに clientId が含まれているか
  const isSharedLink = !!urlClientId;

  // 共有リンクを生成
  const shareUrl = useMemo(() => {
    if (!clientIdInput.trim()) return '';
    const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const url = new URL(base);
    url.pathname = url.pathname.replace(/\/$/, '') + '/login';
    url.searchParams.set('clientId', clientIdInput.trim());
    return url.toString();
  }, [clientIdInput]);

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (!clientIdInput.trim()) {
      setError('Google Client ID を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setGoogleClientId(clientIdInput.trim());
      await loadGapiClient();
      await loadGisClient(clientIdInput.trim());
      const tokenResponse = await requestAccessToken();
      const userInfo = await getUserInfo(tokenResponse.access_token);

      setUser({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokenResponse.access_token,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-garden-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">🌿</span>
          <h1 className="text-2xl font-bold text-garden-700 dark:text-garden-400 mt-4">
            HomeGardenDiary
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">家庭菜園日記</p>
        </div>

        <div className="space-y-4">
          {/* 共有リンクで開いた場合は Client ID 入力を隠してシンプルに */}
          {isSharedLink ? (
            <div className="p-3 bg-garden-50 dark:bg-garden-900/20 border border-garden-200 dark:border-garden-800 rounded-lg">
              <p className="text-sm text-garden-700 dark:text-garden-400">
                🔗 共有リンクから開きました。下のボタンでログインしてください。
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="clientId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Google Client ID
              </label>
              <input
                id="clientId"
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="xxxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-garden-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Google Cloud Console で作成した OAuth 2.0 クライアントID
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-3 bg-garden-600 hover:bg-garden-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google でログイン
              </>
            )}
          </button>
        </div>

        {/* 共有リンクコピーボタン（Client ID が入力されている場合に表示） */}
        {!isSharedLink && clientIdInput.trim() && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
              📤 家族にこのアプリを共有
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400/80">
              以下のリンクを LINE 等で送ると、Client ID の入力なしでログインできます。
            </p>
            <button
              onClick={handleCopyShareLink}
              className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {copied ? '✅ コピーしました！' : '📋 家族用ログインリンクをコピー'}
            </button>
          </div>
        )}

        {!isSharedLink && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <strong>初回セットアップ:</strong>
              <br />
              1. Google Cloud Console でプロジェクトを作成
              <br />
              2. Sheets API / Drive API を有効化
              <br />
              3. OAuth 2.0 クライアントIDを作成
              <br />
              4. 上記にクライアントIDを入力してログイン
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
