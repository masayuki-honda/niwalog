# Copilot Instructions

このファイルは GitHub Copilot がワークスペースで作業する際に自動的に読み込まれるルールです。

## Git 操作のルール

- **`git log`, `git diff`, ブランチ比較など、リモートブランチを参照するコマンドを実行する前に、必ず `git fetch origin` を実行すること。** ローカルのリモート追跡ブランチが古いと、コミット数や差分の結果が不正確になるため。
- PR 作成時は、fetch 後の正確なコミット一覧に基づいて本文を作成すること。
- コミットは機能単位（Phase 単位など）で分割し、適切なタイミングでコミットすること。
- **PR 作成・編集などの GitHub 操作には GitKraken（MCP）ではなく `gh` CLI を使用すること。**

## プロジェクト概要

- **言語:** TypeScript（React 19 + Vite 7）
- **スタイル:** Tailwind CSS
- **状態管理:** Zustand（localStorage 永続化）
- **API:** Google Sheets API v4 / Drive API v3
- **チャート:** Recharts
- **日付:** date-fns（`src/utils/date-imports.ts` 経由で使用）
- **ドキュメント:** `docs/` 配下（design-specification.md, implementation-specification.md, setup-guide.md）
- **GAS スクリプト:** `gas/` 配下

## コーディング規約

- ページコンポーネントは `src/pages/` に1ファイル = 1ルートで配置
- Google Sheets からの行データ変換は各ページ内に `rowToXxx()` 関数として定義
- API 呼び出しは `withAuthRetry()` でラップする
- date-fns の関数は `@/utils/date-imports` から import する（直接 `date-fns` から import しない）
- UIの言語は日本語
