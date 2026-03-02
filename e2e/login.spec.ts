import { test, expect } from '@playwright/test';

/**
 * ログインページ E2E テスト
 * Google OAuth は外部サービスのため自動化不可。
 * UI の表示・バリデーションのみテストする。
 */
test.describe('ログインページ', () => {
  test('未認証時にルートへアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/niwalog/');
    await expect(page).toHaveURL(/\/niwalog\/login/);
  });

  test('ページの主要要素が表示される', async ({ page }) => {
    await page.goto('/niwalog/login');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('niwalog');
    await expect(page.getByText('家庭菜園日記')).toBeVisible();
    await expect(page.locator('#clientId')).toBeVisible();
    await expect(page.getByRole('button', { name: /Google でログイン/ })).toBeVisible();
  });

  test('Client ID が空のままログインするとエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/niwalog/login');
    await page.locator('#clientId').fill('');
    await page.getByRole('button', { name: /Google でログイン/ }).click();
    await expect(page.getByText('Google Client ID を入力してください')).toBeVisible();
  });

  test('Client ID 入力欄にテキストを入力できる', async ({ page }) => {
    await page.goto('/niwalog/login');
    const input = page.locator('#clientId');
    await input.fill('test-client-id.apps.googleusercontent.com');
    await expect(input).toHaveValue('test-client-id.apps.googleusercontent.com');
  });

  test('Client ID 入力後、家族用共有リンクコピーボタンが表示される', async ({ page }) => {
    await page.goto('/niwalog/login');
    await page.locator('#clientId').fill('test-client-id.apps.googleusercontent.com');
    await expect(page.getByRole('button', { name: /家族用ログインリンクをコピー/ })).toBeVisible();
  });

  test('初回セットアップ手順が表示される', async ({ page }) => {
    await page.goto('/niwalog/login');
    await expect(page.getByText('初回セットアップ:')).toBeVisible();
  });
});
