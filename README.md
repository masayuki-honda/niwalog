# 🌿 HomeGardenDiary（家庭菜園日記）

家庭菜園の栽培記録・環境データを一元管理し、分析・振り返りを可能にする Web アプリケーションです。

## 概要

| 項目 | 内容 |
|------|------|
| 対象ユーザー | 家庭菜園を行う個人および家族 |
| 対応デバイス | PC / スマートフォン（ブラウザ + PWA） |
| ホスティング | GitHub Pages |
| バックエンド | Google Sheets API / Google Drive API / GAS |

## 主な機能

- **🌱 栽培区画管理** — プランター・地植えなどの栽培区画の登録・一覧・タイムライン表示
- **📝 作業記録** — 水やり・収穫・施肥などの記録（写真・メモ付き）
- **📸 写真管理** — Google Drive への写真保存、時系列フォトギャラリー
- **🌤️ 気象データ** — Open-Meteo API から自動取得、グラフ表示
- **🌡️ 土壌センサデータ** — 村田製作所センサから GAS Web App 経由で自動受信・グラフ表示
- **📊 分析・相関** — 気温×収穫量、VWC×水やりなどの相関分析
- **📅 振り返り** — 月次・年次サマリーレポート
- **⚙️ 設定** — 地域設定、共有メンバー管理、CSV エクスポート

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Vite + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| ルーティング | React Router v7 |
| 状態管理 | Zustand |
| グラフ | Recharts |
| 認証 | Google Identity Services (OAuth 2.0) |
| DB | Google Sheets API v4 |
| 画像保存 | Google Drive API v3 |
| 気象データ | Open-Meteo API |
| 定期処理 | GAS 時間トリガー |
| センサデータ受信 | GAS Web App (HTTP POST) |

## システム構成

```
ユーザー（PC / スマホ）
        │
        ▼
  GitHub Pages
  └── React SPA（静的サイト）
        ├──→ Google Sheets API → スプレッドシート（DB）
        ├──→ Google Drive API  → Google ドライブ（写真）
        └──→ Open-Meteo API    → 気象データ

  GAS（バックグラウンド処理）
  ├── 時間トリガー：毎日気象データ取得 → シートに書き込み
  └── Web App：土壌センサデータ受信（HTTP POST）→ シートに書き込み
```

## セットアップ

### 前提条件

- Node.js 20 以上
- Google Cloud Platform プロジェクト（Sheets API / Drive API 有効化済み）
- Google スプレッドシート（6 シート作成済み）

### インストール

```bash
git clone https://github.com/<username>/HomeGardenDiary.git
cd HomeGardenDiary
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## 初期セットアップ手順

1. **Google Cloud Platform** — プロジェクト作成、Sheets API / Drive API 有効化、OAuth 2.0 クライアント ID 作成
2. **Google スプレッドシート** — `planters`, `activity_logs`, `weather_data`, `soil_sensor_data`, `settings`, `harvest_summary` の 6 シートを作成
3. **Google ドライブ** — `HomeGardenDiary/planters/`, `HomeGardenDiary/activities/` フォルダを作成
4. **GAS** — 気象データ取得トリガー設定、土壌センサ受信 Web App デプロイ
5. **GitHub Pages** — Settings → Pages → Source: GitHub Actions に設定

詳細は [docs/specification.md](docs/specification.md) を参照してください。
セットアップの具体的な手順は [docs/setup-guide.md](docs/setup-guide.md) を参照してください。

## ディレクトリ構成

```
HomeGardenDiary/
├── .github/workflows/    # GitHub Actions デプロイ設定
├── docs/                 # 仕様書
├── gas/                  # GAS スクリプト
├── public/               # 静的ファイル
├── src/
│   ├── components/       # React コンポーネント
│   ├── constants/        # 定数
│   ├── pages/            # ページコンポーネント
│   ├── services/         # API サービス
│   ├── stores/           # Zustand ストア
│   ├── types/            # TypeScript 型定義
│   └── utils/            # ユーティリティ
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## ライセンス

MIT
