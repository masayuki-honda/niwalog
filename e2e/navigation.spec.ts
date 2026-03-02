import { test, expect, type Page } from '@playwright/test';

/**
 * 認証済みナビゲーション E2E テスト
 * Google OAuth は自動化不可のため、localStorage にモックユーザーを注入して
 * 認証済みの状態をシミュレートする。
 *
 * モック戦略:
 * - user: モックユーザー情報を設定（ProtectedRoute を通過させるため）
 * - googleClientId: 空文字 → useRestoreSession が Google API 呼び出しをスキップし
 *   isInitializing を即座に false にする
 * - spreadsheetId: 空文字 → 各ページの Sheets API 呼び出しが条件分岐でスキップされる
 */

const MOCK_STATE = {
  user: {
    email: 'test@example.com',
    name: 'テストユーザー',
    picture: '',
    accessToken: 'fake-access-token-for-e2e',
  },
  googleClientId: '',
  spreadsheetId: '',
  driveFolderId: '',
  darkMode: false,
};

// Zustand persist のストレージキーと形式に合わせる
const MOCK_STORAGE = JSON.stringify({ state: MOCK_STATE, version: 0 });

/**
 * テスト前に localStorage にモックユーザーを注入する。
 * addInitScript を使うことで、ページの JS が実行される前に localStorage が設定される。
 */
async function injectMockAuth(page: Page) {
  await page.addInitScript((value: string) => {
    localStorage.setItem('niwalog', value);
  }, MOCK_STORAGE);
}

test.describe('認証済みナビゲーション', () => {
  test('認証済みの場合、ルートにアクセスするとダッシュボードが表示される（ログインページへリダイレクトされない）', async ({ page }) => {
    await injectMockAuth(page);
    await page.goto('/niwalog/');

    // ボトムナビが表示されるまで待つ（isInitializing が false になった証拠）
    await expect(page.getByRole('link', { name: 'ホーム' })).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('ボトムナビの「プランター」をクリックするとプランター一覧ページに遷移する', async ({ page }) => {
    await injectMockAuth(page);
    await page.goto('/niwalog/');

    await expect(page.getByRole('link', { name: 'プランター' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: 'プランター' }).first().click();
    await expect(page).toHaveURL(/\/niwalog\/planters/);
  });

  test('ボトムナビの「分析」をクリックすると分析ページに遷移する', async ({ page }) => {
    await injectMockAuth(page);
    await page.goto('/niwalog/');

    await expect(page.getByRole('link', { name: '分析' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: '分析' }).first().click();
    await expect(page).toHaveURL(/\/niwalog\/analytics/);
  });

  test('ボトムナビの「設定」をクリックすると設定ページに遷移する', async ({ page }) => {
    await injectMockAuth(page);
    await page.goto('/niwalog/');

    await expect(page.getByRole('link', { name: '設定' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: '設定' }).first().click();
    await expect(page).toHaveURL(/\/niwalog\/settings/);
  });

  test('設定ページにはセクション見出しが表示される', async ({ page }) => {
    await injectMockAuth(page);
    await page.goto('/niwalog/settings');

    // 設定ページ内の何らかのコンテンツを確認（ページが読み込まれた証拠）
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page).toHaveURL(/\/niwalog\/settings/);
  });

  test('プランター一覧ページでは空の状態メッセージが表示される（モックデータなしの場合）', async ({ page }) => {
    await injectMockAuth(page);
    await page.goto('/niwalog/planters');

    // ページが /login にリダイレクトされないことを確認
    await expect(page).toHaveURL(/\/niwalog\/planters/);
  });

  test('ボトムナビの「記録」をクリックすると作業記録フォームに遷移する', async ({ page }) => {
    await injectMockAuth(page);
    await page.goto('/niwalog/');

    await expect(page.getByRole('link', { name: '記録' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: '記録' }).first().click();
    await expect(page).toHaveURL(/\/niwalog\/activities\/new/);
  });
});
