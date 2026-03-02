import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E テスト設定
 * - 対象ブラウザ: Chromium のみ（CI コスト削減）
 * - テストサーバー: vite preview（`npm run build` 後に起動）
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/niwalog/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
