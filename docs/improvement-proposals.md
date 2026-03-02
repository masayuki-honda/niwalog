# niwalog 構成改善提案

**作成日:** 2026年2月26日
**最終更新日:** 2026年3月2日（E2E テスト導入）

---

## 背景

niwalog は GitHub Pages + Google エコシステム（Sheets API / Drive API / OAuth / GAS）で完全無料を実現している。
アーキテクチャの変更ではなく、品質・運用面の改善に投資するフェーズとして、以下の代替構成と改善案を検討した。

---

## 代替構成案（参考・不採用）

### 案1: Cloudflare Pages + D1（SQLite）+ R2

| 項目 | 現在 | 提案 |
|------|------|------|
| ホスティング | GitHub Pages | Cloudflare Pages（無料枠） |
| DB | Google Sheets API | Cloudflare D1（SQLite、無料枠: 5GB / 500万reads/日） |
| ファイルストレージ | Google Drive API | Cloudflare R2（無料枠: 10GB / 100万reads/月） |
| API層 | クライアント直接呼び出し | Cloudflare Workers（無料枠: 10万req/日） |
| 認証 | Google OAuth (GIS) | そのまま or Cloudflare Access |

**メリット:**
- SQLite ベースで複雑なクエリ（集計・分析）がシート API より高速・柔軟
- Workers でサーバーサイドロジックを持てるため、API キー秘匿やバリデーションが可能
- GAS の時間トリガーの代わりに Cron Triggers（Workers）が使える
- Google API のクォータ制限から解放される

**デメリット:**
- Google スプレッドシートの「直接開いてデータを見る」利便性がなくなる
- Cloudflare へのベンダーロックイン
- 認証周りの再実装が必要

---

### 案2: GitHub Pages + Supabase（PostgreSQL）

| 項目 | 現在 | 提案 |
|------|------|------|
| ホスティング | GitHub Pages | そのまま |
| DB | Google Sheets API | Supabase（無料枠: 500MB / 2プロジェクト） |
| ファイルストレージ | Google Drive API | Supabase Storage（無料枠: 1GB） |
| 認証 | Google OAuth (GIS) | Supabase Auth（Google OAuth プロバイダー対応） |

**メリット:**
- PostgreSQL の RLS（Row Level Security）で家族間のアクセス制御が堅牢
- リアルタイムサブスクリプション（家族の誰かが記録したら即反映）が無料枠で使える
- クライアント SDK が充実

**デメリット:**
- 無料枠のストレージが 1GB（Google Drive 15GB より少ない）
- 無料プロジェクトは 1 週間非アクティブで一時停止
- Google Sheets の手軽さが失われる

---

### 案4: 現構成 + Firebase（部分導入）

| 追加要素 | 内容 |
|---|---|
| Firebase Cloud Messaging | プッシュ通知（水やりリマインダー、気象アラート） |
| Firebase Hosting | GitHub Pages の代替（CDN 高速、プレビューデプロイ対応） |
| Firestore（部分） | リアルタイム性が必要なデータのみ |

Google エコシステム内で統一でき、既存の Google OAuth もそのまま使える。

---

## 採用案: 案3 現構成のままの改善 ★

アーキテクチャ変更なし。品質・運用・開発体験の改善に集中する。

### 改善項目一覧

| # | 改善ポイント | 内容 | 優先度 | 状態 |
|---|---|---|---|---|
| 1 | **テスト追加** | Vitest + React Testing Library。リファクタリングの安全網 | 高 | ✅ 完了 |
| 2 | **CI/CD 強化** | lint / typecheck / test / build を PR 時に自動実行 | 高 | ✅ 完了 |
| 3 | **パフォーマンス監視** | Lighthouse CI を GitHub Actions に組み込み | 中 | ✅ 完了 |
| 4 | **オフライン強化** | Service Worker を Workbox に置き換え。オフライン書き込みキュー + 同期 | 中 | ✅ 完了 |
| 5 | E2E テスト | Playwright で主要フローの自動テスト | 低 | ✅ 完了 |
| 6 | エラー監視 | Sentry 無料枠（5K events/月）で本番エラー可視化 | 低 | ✅ 完了 |
| 7 | PWA 強化 | Firebase Cloud Messaging で水やりリマインダー通知 | 低 | - |

### 段階的実装計画（#1〜#4 を採用）

#### Phase A: テスト基盤 + CI/CD 強化 ✅ 実装済み

**目的:** 以降の改善を安全に進めるための基盤を作る

1. **Vitest + React Testing Library 導入**
   - Vitest インストール・設定（`vitest.config.ts`）
   - React Testing Library + jsdom セットアップ
   - テストユーティリティ（モック等）の共通化
   - 主要コンポーネント・ユーティリティのユニットテスト作成
     - `src/utils/` 内の純粋関数（date-imports, correlation, image-compressor 等）
     - Zustand ストア（app-store, toast-store）
     - 主要ページコンポーネントの描画テスト

2. **CI/CD ワークフロー強化**
   - PR 用ワークフロー新規作成（`.github/workflows/ci.yml`）
     - `npm run lint`（ESLint）
     - `npx tsc --noEmit`（型チェック）
     - `npx vitest run`（テスト実行）
     - `npm run build`（ビルド確認）
   - 既存の `deploy.yml` はそのまま維持（main push 時のデプロイ）

#### Phase B: パフォーマンス監視（Lighthouse CI） ✅ 実装済み

**Lighthouse CI とは:**
Google が提供する **Lighthouse**（ブラウザ内蔵のパフォーマンス測定ツール）を **CI パイプラインで自動実行** するツール。
PR ごとに以下のスコアを自動計測し、閾値を下回ったら CI を失敗させることができる：

| カテゴリ | 測定内容 |
|---|---|
| Performance | FCP, LCP, CLS, TBT 等のCore Web Vitals |
| Accessibility | alt属性、コントラスト比、ARIAラベル等 |
| Best Practices | HTTPS、コンソールエラー、画像アスペクト比等 |
| SEO | meta タグ、構造化データ等 |
| PWA | Service Worker、マニフェスト、オフライン対応等 |

**導入内容:**
- `@lhci/cli` を devDependencies に追加
- `lighthouserc.json` で閾値設定（Performance ≥ 80, Accessibility ≥ 90 等）
- CI ワークフローに Lighthouse CI ジョブを追加
- PR コメントにスコアを自動投稿

#### Phase C: オフライン強化（Workbox） ✅ 実装済み

**現状の Service Worker（移行前）:**
- 手書きの `public/sw.js`（約100行）
- プリキャッシュ: `index.html`, `404.html` のみ
- ナビゲーション: Network First → Cache Fallback
- 静的アセット: Cache First
- Google API リクエストはスキップ（常にネットワーク）
- **書き込み（POST/PUT）のオフラインキューなし**

**Workbox 導入で改善された点:**
- `vite-plugin-pwa` で Vite ビルドと統合（ビルド時にプリキャッシュマニフェスト自動生成）
- 全ビルドアセットの自動プリキャッシュ（手書き sw.js では index.html + 404.html のみだった）
- Workbox の `ExpirationPlugin` でキャッシュサイズ・有効期限を管理
- Google API → `NetworkOnly`、Drive 画像 → `StaleWhileRevalidate`（7日間/200件上限）、天気 API → `NetworkFirst`（6時間/30件上限）
- Service Worker の更新通知 UI（`ReloadPrompt` コンポーネント: 「新しいバージョンがあります」プロンプト）
- 1時間ごとの自動更新チェック

#### Phase E: E2E テスト（Playwright） ✅ 実装済み

**テスト対象:**
- ログインページ（未認証リダイレクト・UI 要素・バリデーション）
- 認証済みナビゲーション（localStorage モックユーザー注入によるフロー検証）

**導入内容:**
- `@playwright/test` を devDependencies に追加
- `playwright.config.ts`: Chromium 限定・`vite preview` をテストサーバーとして使用
- `e2e/login.spec.ts`: ログインページ 6 テスト
- `e2e/navigation.spec.ts`: ナビゲーション 6 テスト
- CI ワークフロー（`ci.yml`）に `e2e` ジョブを追加（`ci` ジョブ完了後に実行）
- テスト失敗時に Playwright レポートを GitHub Actions Artifact として保存

**モック戦略:**
- Google OAuth は外部サービスのため自動化不可
- `page.addInitScript()` で localStorage にモックユーザーを注入
- `googleClientId: ''` にすることで Google API 呼び出しをスキップさせる
- `spreadsheetId: ''` にすることで Sheets API 呼び出しを条件分岐でスキップさせる

#### Phase D: エラー監視（Sentry） ✅ 実装済み

**Sentry とは:**
アプリケーションの実行時エラーを自動収集・可視化するエラー監視サービス。
本番環境で JavaScript の例外が発生した際に以下を自動記録する：

- エラーメッセージとスタックトレース
- 発生 URL・ブラウザ・OS
- エラー発生前のユーザー操作（パンくず）
- 影響ユーザー数

**導入内容:**
- `@sentry/react` を dependencies に追加
- `src/main.tsx` で `Sentry.init()` を初期化（`VITE_SENTRY_DSN` 環境変数が設定されている場合のみ有効化）
- `Sentry.ErrorBoundary` でアプリ全体をラップし、未捕捉エラーを日本語フォールバック UI で表示
- Browser Tracing + Session Replay インテグレーションを設定
- **DSN の設定方法:** Sentry プロジェクトを作成し、DSN を GitHub Secrets の `VITE_SENTRY_DSN` に登録する（[セットアップガイド 9章](./setup-guide.md) 参照）

---

## 比較表

| 観点 | 案1 Cloudflare | 案2 Supabase | **案3 現構成改善** | 案4 Firebase混合 |
|------|:-:|:-:|:-:|:-:|
| 移行コスト | 大 | 中 | **なし** | 小 |
| DB の柔軟性 | 高 | 高 | 低 | 中 |
| 無料枠の余裕 | 十分 | やや少 | **十分** | 十分 |
| Google 連携 | × | △ | **◎** | ◎ |
| 開発体験向上 | ○ | ○ | **◎** | ○ |
| オフライン | 自前実装 | 自前実装 | **強化可** | Firestore対応 |

---

*以上*
