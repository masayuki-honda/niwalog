import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // 本番トレースのサンプリング率（20%）
    tracesSampleRate: 0.2,
    // エラー発生時はセッションリプレイを全件取得
    replaysOnErrorSampleRate: 1.0,
    // 通常セッションのリプレイサンプリング率（10%）
    replaysSessionSampleRate: 0.1,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8">
            <p className="text-4xl mb-4">⚠️</p>
            <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
              予期しないエラーが発生しました。
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              エラーは自動的に報告されました。
            </p>
            <button
              className="mt-6 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </div>
        </div>
      }
    >
      <BrowserRouter basename="/niwalog/">
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
