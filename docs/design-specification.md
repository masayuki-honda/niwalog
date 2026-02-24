# HomeGardenDiary 仕様書

**バージョン:** 3.0
**作成日:** 2026年2月18日
**最終更新:** 2026年2月25日（Phase 4 振り返り・PWA完了）
**ステータス:** 確定

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システム構成](#2-システム構成)
3. [技術スタック](#3-技術スタック)
4. [データ設計](#4-データ設計)
5. [機能一覧](#5-機能一覧)
6. [画面設計](#6-画面設計)
7. [GAS 設計](#7-gas-設計)
8. [分析・相関機能](#8-分析相関機能)
9. [非機能要件](#9-非機能要件)
10. [開発フェーズ](#10-開発フェーズ)
11. [将来実装候補](#11-将来実装候補)
12. [ディレクトリ構成](#12-ディレクトリ構成)
13. [運用コスト](#13-運用コスト)

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | HomeGardenDiary（家庭菜園日記） |
| 目的 | 家庭菜園の栽培記録・環境データを一元管理し、分析・振り返りを可能にする |
| 対象ユーザー | 家庭菜園を行う個人および家族など |
| 予算 | 必要に応じ、Google One 契約。それ以外の追加費用なし |
| 対応デバイス | PC（ブラウザ） / スマートフォン（ブラウザ + PWA） |
| 公開 | GitHub にソースコード公開、GitHub Pages でホスティング |

---

## 2. システム構成

### 2.1 構成図

```
ユーザー（PC / スマホ）
        │
        ▼
  GitHub Pages（完全無料）
  └── React SPA（静的サイト）
        │  ← HTML/CSS/JS のみ配信
        │
        ├──→ Google Sheets API（直接呼び出し）→ スプレッドシート（DB）
        ├──→ Google Drive API（直接呼び出し）→ ドライブ 2TB（写真）
        └──→ Open-Meteo API（直接呼び出し）  → 気象データ

  GAS（バックグラウンド処理）
  ├── 時間トリガー：毎日気象データ取得 → シートに書き込み
  └── Web App：土壌センサデータ受信（HTTP POST）→ シートに書き込み

  Google OAuth
  └── Googleアカウントでログイン（クライアント側で完結）
```

### 2.2 データフロー

```
┌─────────────────────────────────────────────────────────────────┐
│                      データ書き込み                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ① ユーザー操作（React SPA → Google API 直接）                   │
│  ┌───────────┐                                                  │
│  │ React SPA │──→ Sheets API ──→ [作業記録/栽培区画] シート   │
│  │（ブラウザ）│──→ Drive API  ──→ Google ドライブ（写真）        │
│  └───────────┘                                                  │
│                                                                 │
│  ② 気象データ（GAS 時間トリガー → シート書き込み）               │
│  ┌───────────┐                                                  │
│  │   GAS     │──→ Open-Meteo API ──→ [weather_data] シート     │
│  │(毎日1回) │                                                   │
│  └───────────┘                                                  │
│                                                                 │
│  ③ 土壌センサ（外部 → GAS Web App → シート書き込み）            │
│  ┌───────────┐     ┌───────────┐                                │
│  │ 村田センサ │────→│   GAS     │──→ [soil_sensor_data] シート  │
│  │  デバイス  │ HTTP│ Web App   │                                │
│  └───────────┘ POST└───────────┘                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      データ読み取り                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  React SPA ──→ Sheets API ──→ 全シート読み取り → 画面表示       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 技術スタック

| レイヤー | 技術 | 選定理由 |
|----------|------|----------|
| フロントエンド | **Vite 7 + React 19 + TypeScript** | 静的ビルド可、高速、GitHub Pages 対応 |
| UIフレームワーク | **Tailwind CSS** | モダンUI、完全無料 |
| ルーティング | **React Router v7** | SPA用ルーティング |
| 状態管理 | **Zustand** | 軽量、シンプル |
| グラフ・チャート | **Recharts** | React向け、無料、相関分析表示に対応 |
| 認証 | **Google Identity Services (GIS)** | OAuth 2.0、ブラウザ完結 |
| DB | **Google Sheets API v4** | スプレッドシートをDB利用 |
| 画像保存 | **Google Drive API v3** | Google One 2TB 活用 |
| 気象データ | **Open-Meteo API** | 完全無料、API Key 不要 |
| 定期処理 | **GAS 時間トリガー** | 気象データ取得 |
| センサデータ受信 | **GAS Web App** | HTTP POST 受信 |
| ビルド・デプロイ | **GitHub Actions** | push 時に自動ビルド→Pages 公開 |
| PWA | **vite-plugin-pwa** | オフライン・ホーム画面追加 |

### 3.1 セキュリティ方式

| 方式 | 用途 | 詳細 |
|------|------|------|
| Google OAuth トークン | React SPA → Google API | ユーザーがGoogleログイン→アクセストークン取得→Sheets/Drive APIを直接呼び出し。APIキー不要 |
| GAS 簡易認証 | センサ → GAS Web App | API KEY をGAS内に保持。POST時にキー検証 |

---

## 4. データ設計

### 4.1 スプレッドシート構成

```
📊 HomeGardenDiary スプレッドシート
│
├── [シート] planters                    ← React SPA が読み書き
├── [シート] activity_logs               ← React SPA が読み書き
├── [シート] weather_data                ← GAS が書き込み / React SPA が読み取り
├── [シート] soil_sensor_data            ← GAS が書き込み + React SPA が読み取り
├── [シート] settings                    ← React SPA が読み書き / GAS が読み取り
└── [シート] harvest_summary             ← GAS が集計 / React SPA が読み取り
```

### 4.2 書き込み権限

| シート | React SPA（ユーザー操作） | GAS（自動処理） |
|--------|:---:|:---:|
| planters | ✏️ 読み書き | - |
| activity_logs | ✏️ 読み書き | - |
| weather_data | 👁️ 読み取りのみ | ✏️ 書き込み |
| soil_sensor_data | 👁️ 読み取りのみ | ✏️ 書き込み（自動受信） |
| settings | ✏️ 読み書き | 👁️ 読み取り |
| harvest_summary | 👁️ 読み取りのみ | ✏️ 集計書き込み |

### 4.3 シート詳細

#### planters（栽培区画：プランター・地植え等）

| カラム | 型 | 必須 | 説明 |
|--------|-----|:---:|------|
| id | TEXT | ✅ | 一意ID（例: p001） |
| name | TEXT | ✅ | 栽培区画名（例: 「庭A-1」「地植えB」） |
| crop_name | TEXT | ✅ | 作物名（例: 「トマト」） |
| crop_variety | TEXT | | 品種（例: 「桃太郎」） |
| location | TEXT | | 設置場所 |
| start_date | DATE | | 栽培開始日 |
| end_date | DATE | | 栽培終了日 |
| status | TEXT | ✅ | active / archived |
| image_folder_id | TEXT | | Google ドライブのフォルダID |
| memo | TEXT | | メモ |
| created_at | DATETIME | ✅ | 作成日時 |
| updated_at | DATETIME | ✅ | 更新日時 |

#### activity_logs（作業記録）

| カラム | 型 | 必須 | 説明 |
|--------|-----|:---:|------|
| id | TEXT | ✅ | 一意ID |
| planter_id | TEXT | ✅ | 対象プランターID |
| user_name | TEXT | ✅ | 記録者名 |
| activity_type | TEXT | ✅ | 作業種別（下表参照） |
| activity_date | DATE | ✅ | 作業日 |
| memo | TEXT | | 作業メモ |
| quantity | NUMBER | | 数量（収穫量など） |
| unit | TEXT | | 単位（g, kg, 個 など） |
| photo_file_ids | TEXT | | Google ドライブのファイルID（カンマ区切り） |
| created_at | DATETIME | ✅ | 作成日時 |

**activity_type 一覧:**

| コード | 表示名 | 説明 |
|--------|--------|------|
| watering | 水やり | 水やり記録 |
| fertilizing | 施肥 | 肥料種類をmemoに記録 |
| harvest | 収穫 | quantity/unitに収穫量 |
| pruning | 剪定 | |
| planting | 定植 | |
| seeding | 播種 | |
| pest_control | 病害虫対策 | |
| weeding | 除草 | |
| thinning | 間引き | |
| support | 支柱立て | |
| observation | 観察 | 一般的な観察記録 |
| other | その他 | |

#### weather_data（気象データ）

| カラム | 型 | 必須 | 説明 |
|--------|-----|:---:|------|
| date | DATE | ✅ | 対象日 |
| temp_max | NUMBER | | 最高気温 (℃) |
| temp_min | NUMBER | | 最低気温 (℃) |
| temp_avg | NUMBER | | 平均気温 (℃) |
| precipitation | NUMBER | | 降水量 (mm) |
| solar_radiation | NUMBER | | 日射量 (MJ/m²) |
| humidity_avg | NUMBER | | 平均湿度 (%) |
| wind_speed_max | NUMBER | | 最大風速 (m/s) |
| source | TEXT | ✅ | データソース（open-meteo） |
| fetched_at | DATETIME | ✅ | 取得日時 |

**Open-Meteo API 取得パラメータ:**

```
daily: temperature_2m_max, temperature_2m_min, temperature_2m_mean,
       precipitation_sum, shortwave_radiation_sum,
       relative_humidity_2m_mean, wind_speed_10m_max
```

#### soil_sensor_data（土壌センサデータ）

| カラム | 型 | 必須 | 説明 |
|--------|-----|:---:|------|
| id | TEXT | ✅ | 一意ID |
| planter_id | TEXT | ✅ | 対象プランターID |
| measured_at | DATETIME | ✅ | 計測日時 |
| vwc | NUMBER | | 体積含水率 VWC (%) |
| soil_temp | NUMBER | | 地温 (℃) |
| ec_bulk | NUMBER | | バルクEC (dS/m) |
| ec_pore | NUMBER | | ポアEC (dS/m) |
| created_at | DATETIME | ✅ | 作成日時 |

**対象センサ:** 村田製作所 土壌センサ
**データ取り込み方式:**

| 方式 | 経路 | 用途 |
|------|------|------|
| HTTP POST | センサ → GAS Web App → シート | IoT自動送信 |

**データがない栽培区画では土壌センサ関連UIを非表示にする。**

#### settings（設定）

| カラム | 型 | 必須 | 説明 |
|--------|-----|:---:|------|
| key | TEXT | ✅ | 設定キー |
| value | TEXT | ✅ | 設定値 |

**初期設定項目:**

| key | value（例） | 説明 |
|-----|------------|------|
| latitude | 35.6812 | 緯度（気象データ取得用） |
| longitude | 139.7671 | 経度（気象データ取得用） |
| timezone | Asia/Tokyo | タイムゾーン |
| owner_email | user@example.com | オーナーのメール |
| shared_emails | family@example.com | 共有メンバー（カンマ区切り） |

#### harvest_summary（収穫サマリー）

| カラム | 型 | 必須 | 説明 |
|--------|-----|:---:|------|
| year | NUMBER | ✅ | 年 |
| month | NUMBER | ✅ | 月 |
| planter_id | TEXT | ✅ | プランターID |
| crop_name | TEXT | ✅ | 作物名 |
| total_quantity | NUMBER | ✅ | 合計収穫量 |
| unit | TEXT | ✅ | 単位 |
| count | NUMBER | ✅ | 収穫回数 |

### 4.4 Google ドライブ フォルダ構成

```
Google ドライブ（2TB）
└── HomeGardenDiary/
    ├── planters/
    │   ├── p001/                    # 栽培区画ごとのフォルダ
    │   │   ├── 2026-02-18_001.jpg
    │   │   ├── 2026-02-18_002.jpg
    │   │   └── ...
    │   └── p002/
    │       └── ...
    └── activities/
        ├── a001/                    # 作業記録ごとのフォルダ
        │   ├── photo1.jpg
        │   └── photo2.jpg
        └── ...
```

**画像最適化:**
- アップロード前にクライアント側でリサイズ
- 長辺 1280px、JPEG品質 70%
- 1枚あたり 100〜200KB に圧縮

---

## 5. 機能一覧

### 5.1 機能階層図

```
HomeGardenDiary
├── 🔐 認証
│   ├── Googleアカウントでログイン
│   ├── 共有メンバー管理（settings シートで管理）
│   └── ログアウト
│
├── 🌱 栽培区画管理
│   ├── 栽培区画一覧（カード表示）
│   ├── 栽培区画登録 / 編集 / アーカイブ
│   ├── 栽培区画詳細（タイムライン表示）
│   └── 栽培区画写真ギャラリー
│
├── 📝 作業記録
│   ├── 作業記録の登録（写真・メモ付き）
│   ├── 作業記録の編集 / 削除
│   ├── 作業一覧（フィルタ: 種別 / 日付 / 栽培区画）
│   ├── カレンダー表示
│   └── ワンタップ簡易登録（水やり等）
│
├── 📸 写真管理
│   ├── 写真アップロード（カメラ / ギャラリーから）
│   ├── 写真へのメモ / キャプション
│   ├── 時系列フォトギャラリー
│   └── 成長比較（Before/After 表示）
│
├── 🌤️ 気象データ
│   ├── 自動取得（GAS 時間トリガー / Open-Meteo API）
│   ├── 気温グラフ（日別 / 月別）
│   ├── 降水量グラフ
│   ├── 日射量グラフ
│   └── 期間選択（1週間 / 1ヶ月 / 3ヶ月 / 1年 / カスタム）
│
├── 🌡️ 土壌センサデータ
│   ├── GAS Web App で自動受信（HTTP POST）
│   ├── VWC（体積含水率）グラフ
│   ├── 地温グラフ
│   ├── EC_BULK / EC_PORE グラフ
│   └── データが無い場合は非表示
│
├── 📊 分析・相関
│   ├── 気温 × 収穫量（散布図 + 相関係数）
│   ├── VWC × 水やり記録（重ね合わせグラフ）
│   ├── EC値 × 施肥記録（重ね合わせグラフ）
│   ├── 降水量 × VWC（散布図 + 相関係数）
│   ├── 積算温度 × 生育ステージ
│   ├── 年次比較（同作物の前年対比）
│   ├── 収穫ダッシュボード（月別・年別・作物別）
│   ├── 日射量 × 収穫量（散布図）
│   └── 水やり最適化提案（VWC閾値ライン付き）
│
├── 📅 振り返り
│   ├── 月次サマリー（作業回数・収穫量・気象概況・写真ハイライト）
│   ├── 年次サマリー
│   ├── 栽培区画別シーズンサマリー
│   └── タイムライン表示（全体 / 栽培区画別）
│
└── ⚙️ 設定
    ├── 地域設定（緯度・経度）
    ├── 共有メンバー管理
    ├── データエクスポート（CSV）
    └── テーマ設定（ライト / ダーク）
```

### 5.2 各機能詳細

#### F-01: 認証

| ID | 機能 | 詳細 |
|----|------|------|
| F-01-01 | Googleログイン | Google Identity Services (GIS) を使用。ブラウザ側で完結 |
| F-01-02 | 共有管理 | settings シートの shared_emails で管理。スプレッドシート/ドライブの共有権限と連動 |
| F-01-03 | ログアウト | トークン破棄 |

#### F-02: 栽培区画管理

| ID | 機能 | 詳細 |
|----|------|------|
| F-02-01 | 一覧表示 | カード形式、サムネイル + 作物名 + ステータス |
| F-02-02 | 登録 | 作物名、品種、場所、開始日、写真 |
| F-02-03 | 詳細 | タイムライン形式で作業記録・写真・センサデータを統合表示 |
| F-02-04 | アーカイブ | 栽培終了時にアーカイブ、一覧から非表示（フィルタで表示可） |
| F-02-05 | フィルタ | 作物種別、ステータス、期間でフィルタ |

#### F-03: 作業記録

| ID | 機能 | 詳細 |
|----|------|------|
| F-03-01 | 簡易入力 | 「水やり」「収穫」などワンタップ登録 |
| F-03-02 | 詳細入力 | 写真（複数可）、メモ、数量、単位 |
| F-03-03 | カレンダー | 月間カレンダーにアイコンで作業表示 |
| F-03-04 | 一括操作 | 複数栽培区画への同時水やり記録など |

#### F-04: 写真管理

| ID | 機能 | 詳細 |
|----|------|------|
| F-04-01 | アップロード | カメラ直接撮影 or ギャラリー選択。クライアント側で長辺1280px, JPEG 70% にリサイズ |
| F-04-02 | ギャラリー | 栽培区画別・時系列表示 |
| F-04-03 | 成長比較 | 同一栽培区画の写真を2枚並べて比較 |

#### F-05: 気象データ

| ID | 機能 | 詳細 |
|----|------|------|
| F-05-01 | 自動取得 | GAS 時間トリガー（毎日 5:00〜6:00）で Open-Meteo API から取得しシートに書き込み |
| F-05-02 | 表示 | 折れ線グラフ（気温）、棒グラフ（降水量）、エリアチャート（日射量） |
| F-05-03 | 期間選択 | 1週間 / 1ヶ月 / 3ヶ月 / 1年 / カスタム |
| F-05-04 | 過去データ一括取得 | 初回設定時に過去1年分を一括取得（GAS関数を手動実行） |

#### F-06: 土壌センサデータ

| ID | 機能 | 詳細 |
|----|------|------|
| F-06-01 | 自動受信 | GAS Web App（HTTP POST）で村田センサからのデータを受信 |
| F-06-02 | グラフ表示 | VWC, 地温, EC_BULK, EC_PORE の時系列グラフ |
| F-06-03 | 条件付き表示 | データが存在する栽培区画のみセンサタブ表示 |

#### F-07: 分析・相関

| ID | 機能 | 詳細 | 分析手法 |
|----|------|------|----------|
| F-07-01 | 気温 × 収穫量 | 月平均気温と月間収穫量の相関 | 散布図 + ピアソン相関係数 |
| F-07-02 | VWC × 水やり | VWC時系列に水やりイベントをオーバーレイ | 重ね合わせチャート |
| F-07-03 | EC × 施肥 | EC_PORE時系列に施肥イベントをオーバーレイ | 重ね合わせチャート |
| F-07-04 | 降水量 × VWC | 降水量とVWCの相関 | 散布図 + 相関係数 |
| F-07-05 | 積算温度 | 定植日からの積算温度計算・表示 | 折れ線グラフ |
| F-07-06 | 年次比較 | 同作物の前年/今年の収穫量・生育比較 | 並列棒グラフ |
| F-07-07 | 収穫ダッシュボード | 月別・年別・作物別の収穫量集計 | 棒グラフ + テーブル |
| F-07-08 | 日射量 × 収穫量 | 積算日射量と収穫量の相関 | 散布図 |
| F-07-09 | 水やり最適化提案 | VWC推移から水やりタイミングの傾向表示 | 閾値ライン付きチャート |

#### F-08: 振り返り

| ID | 機能 | 詳細 |
|----|------|------|
| F-08-01 | 月次サマリー | 作業回数、収穫量、気象概況、写真ハイライト |
| F-08-02 | 年次サマリー | 年間の作物別収穫量、栽培期間、ベストショット |
| F-08-03 | タイムライン | 全栽培区画統合 or 栽培区画別の時系列表示 |
| F-08-04 | 期間フィルタ | 月 / 四半期 / 年 / カスタム範囲 |

#### F-09: 設定

| ID | 機能 | 詳細 |
|----|------|------|
| F-09-01 | 地域設定 | 緯度・経度（気象データ取得地点） |
| F-09-02 | 共有管理 | メールアドレスでメンバー追加/削除 |
| F-09-03 | エクスポート | 全データを CSV 形式でダウンロード |
| F-09-04 | テーマ | ライト / ダークモード切り替え |

---

## 6. 画面設計

### 6.1 画面一覧

| # | 画面名 | パス | 説明 |
|---|--------|------|------|
| 1 | ログイン | `/login` | Google ログイン画面 |
| 2 | ダッシュボード | `/` | 今日の天気・最近の作業・栽培区画概要 |
| 3 | 栽培区画一覧 | `/planters` | カード形式で全栽培区画表示 |
| 4 | 栽培区画詳細 | `/planters/:id` | タイムライン + タブ（作業/写真/センサ/分析） |
| 5 | 作業記録登録 | `/activities/new` | フォーム（モーダル or ページ） |
| 6 | カレンダー | `/calendar` | 月間カレンダー + 作業アイコン |
| 7 | 気象データ | `/weather` | 気象グラフ表示 |
| 8 | 土壌センサ | `/soil-sensor` | センサデータグラフ（クエリパラメータ `planterId` で栽培区画選択） |
| 9 | 分析 | `/analytics` | 各種相関分析・ダッシュボード |
| 10 | 振り返り | `/review` | 月次/年次レポート |
| 11 | 設定 | `/settings` | ユーザー設定 |
| 12 | 写真ギャラリー | `/photos` | 全体 or 栽培区画別フォトギャラリー |

### 6.2 ダッシュボード画面レイアウト

```
┌─────────────────────────────────────────────────────┐
│  🌿 HomeGardenDiary          [🔔] [👤 ユーザー名]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📅 2026年2月18日（水）                              │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🌤 今日の天気: 晴れ  最高12℃ / 最低3℃       │    │
│  │    降水量: 0mm   日射量: 12.5 MJ/m²          │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── 最近の作業 ──────────────────────── [+記録する]  │
│  ┌────────┐ ┌────────┐ ┌────────┐                  │
│  │💧 水やり│ │🌿 収穫 │ │📸 観察 │                  │
│  │トマト   │ │きゅうり │ │ナス    │                  │
│  │ 2/18   │ │ 2/17   │ │ 2/17   │                  │
│  └────────┘ └────────┘ └────────┘                  │
│                                                     │
│  ── 栽培区画 ────────────────────── [一覧を見る →]  │
│  ┌──────────────┐ ┌──────────────┐                  │
│  │ 📷           │ │ 📷           │                  │
│  │ トマト(桃太郎)│ │ きゅうり     │                  │
│  │ 栽培中 35日目 │ │ 栽培中 20日目 │                  │
│  │ 最終: 水やり  │ │ 最終: 収穫   │                  │
│  └──────────────┘ └──────────────┘                  │
│                                                     │
│  ── 収穫サマリー（今月）────────────                  │
│  │████████      │ トマト     2.5 kg                 │
│  │████          │ きゅうり   1.2 kg                 │
│  │██            │ ナス       0.6 kg                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [🏠ホーム] [🌱栽培区画] [➕記録] [📊分析] [⚙設定]  │
└─────────────────────────────────────────────────────┘
```

### 6.3 栽培区画詳細画面レイアウト

```
┌─────────────────────────────────────────────────────┐
│  [← 戻る]   トマト（桃太郎）          [✏️編集]       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │              📷 メイン写真                    │    │
│  └─────────────────────────────────────────────┘    │
│  場所: 庭プランターA  │ 栽培開始: 2026/04/15       │
│  状態: 栽培中 (35日目) │ 品種: 桃太郎              │
│                                                     │
│  [タイムライン] [📸写真] [🌡センサ] [📊分析]         │
│  ━━━━━━━━━━━                                       │
│                                                     │
│  ── タイムライン ──                                  │
│  📅 2/18  💧 水やり                                  │
│            メモ: 朝、たっぷりと                      │
│  ─────────────────                                  │
│  📅 2/17  🌿 収穫  350g                             │
│            📷[写真] メモ: 3個収穫、色づき良好        │
│  ─────────────────                                  │
│  📅 2/15  🧪 施肥                                   │
│            メモ: 液肥ハイポネックス 500倍             │
│  ─────────────────                                  │
│                         [もっと見る]                 │
│                                                     │
│                                 [＋ 作業を記録する]  │
├─────────────────────────────────────────────────────┤
│  [🏠ホーム] [🌱栽培区画] [➕記録] [📊分析] [⚙設定]  │
└─────────────────────────────────────────────────────┘
```

---

## 7. GAS 設計

### 7.1 ファイル構成

```
gas/
├── soil-sensor-receiver.gs     # 土壌センサ HTTP POST 受信（Web App）
├── weather-fetcher.gs          # 気象データ定期取得
├── triggers-setup.gs           # トリガー設定
└── README.md                   # GAS 設定手順
```

### 7.2 GAS トリガー

| トリガー | 関数 | スケジュール | 説明 |
|----------|------|-------------|------|
| 時間トリガー | `fetchDailyWeather` | 毎日 5:00〜6:00 | Open-Meteo API から気象データ取得（GAS の仕様により指定時間帯内でランダム実行） |

### 7.3 GAS Web App（土壌センサ受信）

**エンドポイント:** `https://script.google.com/macros/s/{DEPLOY_ID}/exec`

**リクエスト形式:**
```json
{
  "api_key": "your-secret-key",
  "planter_id": "p001",
  "data": [
    {
      "measured_at": "2026-02-18T10:00:00+09:00",
      "vwc": 32.5,
      "soil_temp": 18.3,
      "ec_bulk": 0.45,
      "ec_pore": 1.23
    }
  ]
}
```

**レスポンス:**
```json
{
  "success": true,
  "inserted": 1
}
```

**認証:** リクエストボディの `api_key` で簡易認証。キーは GAS 内の定数に保持。

### 7.4 気象データ取得（Open-Meteo API）

**取得パラメータ:**
```
URL: https://api.open-meteo.com/v1/forecast
Parameters:
  latitude: {settings.latitude}
  longitude: {settings.longitude}
  daily: temperature_2m_max, temperature_2m_min, temperature_2m_mean,
         precipitation_sum, shortwave_radiation_sum,
         relative_humidity_2m_mean, wind_speed_10m_max
  timezone: Asia/Tokyo
  past_days: 1 (前日分を取得)
```

---

## 8. 分析・相関機能

### 8.1 相関分析一覧

| 分析名 | X軸 | Y軸 | チャート種別 | 利用データ |
|--------|-----|-----|-------------|-----------|
| 気温×収穫量 | 月平均気温 | 月間収穫量 | 散布図 + 回帰線 | weather_data + activity_logs(harvest) |
| VWC×水やり | 時間 | VWC値 + 水やりイベント | 複合チャート | soil_sensor_data + activity_logs(watering) |
| EC×施肥 | 時間 | EC_PORE値 + 施肥イベント | 複合チャート | soil_sensor_data + activity_logs(fertilizing) |
| 降水量×VWC | 日間降水量 | 日平均VWC | 散布図 | weather_data + soil_sensor_data |
| 日射量×収穫量 | 月間積算日射量 | 月間収穫量 | 散布図 | weather_data + activity_logs(harvest) |
| 積算温度 | 経過日数 | 積算温度 (℃·日) | 折れ線 | weather_data |
| 年次比較 | 月 | 収穫量 | 並列棒グラフ | harvest_summary |

### 8.2 統計計算

**クライアント側（JavaScript）で計算:**

- **ピアソン相関係数:** 散布図の相関強度表示
- **積算温度:** `Σ max(日平均気温 - 基準温度, 0)` （基準温度は作物により設定、デフォルト10℃）
- **月別集計:** 収穫量、作業回数の月次/年次集計

---

## 9. 非機能要件

| 項目 | 要件 |
|------|------|
| レスポンス | 初回ロード 3秒以内、データ取得 1-2秒以内 |
| 画像最適化 | アップロード時にクライアント側で長辺1280px、JPEG 70%に圧縮 |
| PWA対応 | Service Worker によるキャッシュ、ホーム画面追加可能 |
| レスポンシブ | モバイルファースト、PC / タブレット / スマホ対応 |
| セキュリティ | Google OAuth によるアクセス制御。スプレッドシート/ドライブの共有権限で制御 |
| データ保持 | Google One 契約期間中は無期限 |
| 同時利用 | 5人程度を想定 |
| ブラウザ対応 | Chrome, Safari, Edge の最新2バージョン |
| アクセシビリティ | 基本的なキーボード操作・スクリーンリーダー対応 |

### 9.1 GitHub Pages の制限

| 項目 | 制限 | 想定影響 |
|------|------|---------|
| サイトサイズ | 1GB推奨 | ビルド後数MBなので問題なし |
| 帯域 | 100GB/月 | 個人利用なら問題なし |
| ビルド回数 | 10回/時間 | 十分 |
| HTTPS | 自動（無料） | 問題なし |
| カスタムドメイン | 対応 | 任意で設定可 |

### 9.2 Google API の制限

| API | 制限 | 想定影響 |
|-----|------|---------|
| Sheets API | 300リクエスト/分/プロジェクト | 個人利用なら問題なし |
| Drive API | 20,000リクエスト/日 | 個人利用なら問題なし |
| GAS 実行時間 | 6分/回 | 気象データ取得は数秒で完了 |
| GAS トリガー | 20個/スクリプト | 1個使用、問題なし |

---

## 10. 開発フェーズ

### Phase 1: MVP（4-6週間）✅ 完了

- [x] プロジェクトセットアップ（Vite + React + TypeScript）
- [x] GitHub Actions / GitHub Pages デプロイ設定
- [x] Google OAuth ログイン
- [x] Google Sheets API / Drive API 連携基盤
- [x] 栽培区画 CRUD
- [x] 作業記録 CRUD（写真付き）
- [x] 栽培区画詳細タイムライン表示
- [x] 基本レスポンシブデザイン（モバイル + PC）

### Phase 2: 環境データ（2-3週間）✅ 完了

- [x] GAS: Open-Meteo API から気象データ自動取得（weather-fetcher.gs）
- [x] 気象グラフ表示（気温・降水量・日射量 — Recharts による複合チャート + タブUI）
- [x] GAS: 土壌センサ HTTP POST 受信 Web App（soil-sensor-receiver.gs）
- [x] 土壌センサグラフ表示（VWC・地温・EC — Recharts + VWC 閾値ライン）
- [x] ダッシュボードに天気サマリーカード追加
- [x] サイドバーに土壌センサーナビゲーション追加
- [x] GAS トリガー設定スクリプト（triggers-setup.gs）

### Phase 3: 分析・共有（2-3週間）✅ 完了

- [x] 相関分析（気温×収穫、日射量×収穫、降水量×VWC、VWC×水やり、EC×施肥）
- [x] 収穫ダッシュボード（月別・年別・作物別 — 積み上げ棒グラフ + サマリーテーブル）
- [x] 積算温度（GDD）計算・表示（基準温度可変、プランター別）
- [x] 共有メンバー管理（メール追加/削除、スプレッドシート/ドライブ権限自動連動）

### Phase 4: 振り返り・PWA（2週間）✅ 完了

- [x] 月次・年次サマリーレポート
- [x] カレンダー表示
- [x] PWA 対応（オフラインキャッシュ・ホーム画面追加）
- [x] データエクスポート（CSV）

### Phase 5: 改善・追加（継続）

- [ ] UI/UX 改善
- [ ] パフォーマンス最適化
- [ ] 将来実装候補の順次対応

---

## 11. 将来実装候補

以下は現時点では実装対象外だが、将来的に追加を検討する機能。

| ID | 機能 | おすすめ度 | 実装コスト | 想定Phase | 説明 |
|:---:|------|:---:|:---:|:---:|------|
| F-future-01 | 天気予報 + 作業アドバイス | ★★★ | 低 | Phase 2 | Open-Meteo Forecast API で1週間先の天気取得。霜注意アラート含む |
| F-future-02 | 今日やることリスト | ★★★ | 低 | Phase 1 | 前回作業日からの経過日数で自動生成。完了タップで作業記録に自動登録 |
| F-future-03 | 収穫予測・カウントダウン | ★★★ | 中 | Phase 3 | 積算温度 + 過去記録から収穫時期を予測 |
| F-future-04 | 生育ステージ管理 | ★★★ | 中 | Phase 1 | 播種→発芽→定植→開花→着果→収穫の段階を可視化 |
| F-future-05 | 作物ライブラリ・栽培ガイド | ★★★ | 中 | Phase 2 | 主要野菜の適正温度・栽培日数・連作情報をマスタデータとして内蔵 |
| F-future-06 | 連作管理マップ | ★★★ | 中 | Phase 4 | 栽培区画の過去栽培履歴を表示、連作障害リスクをアラート |
| F-future-07 | 種まき・定植カレンダー | ★★☆ | 中 | Phase 2 | 地域の気候に基づく作物別の播種・定植適期カレンダー |
| F-future-08 | コスト管理 | ★★☆ | 低 | Phase 4 | 苗代・肥料代を記録、収穫量あたりの原価を算出 |
| F-future-09 | 病害虫図鑑・記録 | ★★☆ | 中 | Phase 4 | 発生した病害虫の写真・対処法を記録。翌年同時期にアラート |
| F-future-10 | 水やりスコア | ★★☆ | 中 | Phase 3 | VWC適正範囲内の割合をスコア化、水やり評価 |
| F-future-11 | 共有コメント・メモ | ★★☆ | 低 | Phase 3 | 家族間で栽培区画にコメントを残せる機能 |
| F-future-12 | AI 画像診断 | ★☆☆ | 高 | Phase 5+ | 撮影した葉の写真から病気の可能性を判定（Gemini API等） |
| F-future-13 | 音声入力 | ★☆☆ | 中 | Phase 5+ | Web Speech API で音声から作業記録を自動登録 |
| F-future-14 | SNS風写真タイムライン | ★☆☆ | 低 | Phase 5+ | 全栽培区画統合の写真タイムライン。いいね・コメント機能 |
| F-future-15 | QRコード付き栽培区画ラベル | ★☆☆ | 低 | Phase 4 | QRコード読み取りで該当栽培区画の詳細ページに直接遷移 |

---

## 12. ディレクトリ構成

```
HomeGardenDiary/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions: ビルド→Pages公開
├── docs/
│   └── specification.md            # 本仕様書
├── gas/
│   ├── soil-sensor-receiver.gs     # 土壌センサ HTTP POST 受信
│   ├── weather-fetcher.gs          # 気象データ定期取得
│   ├── triggers-setup.gs           # トリガー設定
│   └── README.md                   # GAS 設定手順
├── public/
│   ├── icons/                      # PWAアイコン
│   ├── manifest.json               # PWAマニフェスト
│   └── 404.html                    # SPA用フォールバック
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── pages/
│   │   ├── Dashboard.tsx           # ダッシュボード
│   │   ├── Login.tsx               # Googleログイン
│   │   ├── PlanterList.tsx         # 栽培区画一覧
│   │   ├── PlanterDetail.tsx       # 栽培区画詳細
│   │   ├── ActivityForm.tsx        # 作業記録登録
│   │   ├── Calendar.tsx            # カレンダー
│   │   ├── Weather.tsx             # 気象データ
│   │   ├── SoilSensor.tsx          # 土壌センサ
│   │   ├── Analytics.tsx           # 分析・相関
│   │   ├── Review.tsx              # 振り返り
│   │   ├── PhotoGallery.tsx        # 写真ギャラリー
│   │   └── Settings.tsx            # 設定
│   ├── components/
│   │   ├── ui/                     # shadcn/ui コンポーネント
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── BottomNav.tsx       # モバイル下部ナビ
│   │   │   └── Sidebar.tsx         # PC用サイドバー
│   │   ├── charts/
│   │   │   ├── WeatherChart.tsx
│   ├── services/
│   │   ├── google-auth.ts          # Google OAuth
│   │   ├── sheets-api.ts           # Sheets API ラッパー（weather/soil取得含む）
│   │   └── drive-api.ts            # Drive API ラッパー
│   ├── stores/
│   │   └── app-store.ts            # Zustand 状態管理
│   ├── types/
│   │   ├── index.ts                # TypeScript 型定義
│   │   └── google.d.ts             # GAPI / GIS 型宣言
│   ├── constants/
│   │   └── index.ts                # 定数定義
│   └── utils/
│       ├── index.ts                # 汎用ユーティリティ
│       ├── auth-retry.ts           # 401リトライ処理
│       ├── image-compressor.ts     # 画像圧縮
│       └── date-imports.ts         # date-fns re-export
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 13. 運用コスト

### 13.1 サービス別コスト

| サービス | 費用 | 制限 | リスク |
|----------|------|------|:---:|
| GitHub Pages | 無料 | 100GB帯域/月、1GBサイト | ✅ |
| GitHub Actions | 無料 | 2,000分/月（Public Repo） | ✅ |
| Google Sheets API | 無料 | 300リクエスト/分 | ✅ |
| Google Drive API | 無料 | 20,000リクエスト/日 | ✅ |
| Google Drive 容量 | Google One 契約内 | 2TB（将来拡張可能） | ✅ |
| GAS | 無料 | 6分/実行、トリガー20個 | ✅ |
| Open-Meteo | 無料 | 非商用無制限 | ✅ |
| **合計** | **Google One 以外の追加費用なし** | | |

### 13.2 容量見積もり

**スプレッドシート（データ量）:**
| データ | 行数/年 | 10年後 |
|--------|---------|--------|
| 作業記録 | 〜1,800行（1日5件） | 18,000行 |
| 気象データ | 365行 | 3,650行 |
| 土壌センサ | 〜8,760行（1時間1回） | 87,600行 |
| → 1シート上限1,000万セルに対し十分余裕あり | | |

**Google ドライブ（写真容量）:**
| 使用ペース | 容量/年 | 2TB消費 |
|-----------|---------|---------|
| 週5枚（〜200KB/枚） | 〜50MB | 約40,000年 |
| 週20枚 | 〜200MB | 約10,000年 |
| 毎日10枚 | 〜700MB | 約2,800年 |
| → 容量の心配なし | | |

---

## 付録A: GitHub Pages デプロイ設定

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 付録B: 初期セットアップ手順（概要）

### B-1. Google Cloud Platform 設定

1. Google Cloud Console でプロジェクト作成
2. Google Sheets API / Google Drive API を有効化
3. OAuth 2.0 クライアントID を作成（Webアプリケーション）
4. 承認済みリダイレクトURI に GitHub Pages の URL を追加

### B-2. Google スプレッドシート作成

1. 新規スプレッドシートを作成
2. 6つのシート（planters, activity_logs, weather_data, soil_sensor_data, settings, harvest_summary）を作成
3. 各シートにヘッダー行を設定
4. 妻など共有メンバーに編集権限を付与

### B-3. Google ドライブ フォルダ作成

1. `HomeGardenDiary` フォルダを作成
2. 配下に `planters/`, `activities/` フォルダを作成
3. 共有メンバーにアクセス権を付与

### B-4. GAS 設定

1. Google スプレッドシートから「拡張機能」→「Apps Script」を開く
2. `soil-sensor-receiver.gs`, `weather-fetcher.gs`, `triggers-setup.gs` をコピー
3. 定数（SPREADSHEET_ID, API_KEY 等）を設定
4. `setupTriggers()` を実行してトリガーを登録
5. Web Appとしてデプロイ（土壌センサ受信用）

### B-5. GitHub リポジトリ / Pages 設定

1. GitHub にリポジトリ作成（Public）
2. Settings → Pages → Source: GitHub Actions
3. コードを push → 自動ビルド・デプロイ
4. 公開URL: `https://{username}.github.io/HomeGardenDiary/`

---

*以上*
