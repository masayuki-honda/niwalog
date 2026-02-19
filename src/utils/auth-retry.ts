import { useAppStore } from '@/stores/app-store';
import { refreshAccessToken, setGapiAccessToken } from '@/services/google-auth';

/**
 * 401 エラー時にアクセストークンをサイレントリフレッシュしてリトライするユーティリティ。
 *
 * 使い方:
 *   const result = await withAuthRetry((token) => uploadFile(blob, name, folderId, token));
 *
 * - 最初にストアの現在のトークンで fn を実行
 * - 401 エラーが発生した場合、GIS 経由でトークンをリフレッシュし再試行 (1回のみ)
 * - リフレッシュに成功したらストアのユーザー情報も更新
 */
export async function withAuthRetry<T>(
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const { user } = useAppStore.getState();
  if (!user?.accessToken) throw new Error('Not authenticated');

  try {
    return await fn(user.accessToken);
  } catch (err) {
    // 401 判定: メッセージに "401" を含むか確認
    const is401 =
      err instanceof Error &&
      (err.message.includes('401') || err.message.includes('UNAUTHENTICATED'));
    if (!is401) throw err;

    // トークンリフレッシュを試行
    const newToken = await refreshAccessToken();

    // ストアとGAPIクライアントを更新
    const store = useAppStore.getState();
    if (store.user) {
      store.setUser({ ...store.user, accessToken: newToken });
    }
    setGapiAccessToken(newToken);

    // リフレッシュ後のトークンで再試行
    return await fn(newToken);
  }
}
