# セットアップガイド

HomeGardenDiary を動かすための初期設定手順です。

---

## 目次

1. [前提条件](#1-前提条件)
2. [GitHub リポジトリ / Pages 設定](#2-github-リポジトリ--pages-設定)
3. [Google Cloud Platform 設定](#3-google-cloud-platform-設定)
4. [Google スプレッドシート作成](#4-google-スプレッドシート作成)
5. [アプリ内の初期設定](#5-アプリ内の初期設定)
6. [動作確認](#6-動作確認)
7. [GAS 設定（気象データ自動取得・土壌センサ受信）](#7-gas-設定気象データ自動取得土壌センサ受信)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. 前提条件

- **Node.js** 20 以上
- **Git** がインストール済み
- **Google アカウント**（Gmail）
- **GitHub アカウント**

---

## 2. GitHub リポジトリ / Pages 設定

### 2-1. リポジトリ作成

1. [GitHub](https://github.com/) で新規リポジトリを作成
   - リポジトリ名: `HomeGardenDiary`
   - Public に設定（GitHub Pages の無料利用に必要）

### 2-2. ローカルリポジトリをプッシュ

```bash
cd HomeGardenDiary
git remote add origin https://github.com/<ユーザー名>/HomeGardenDiary.git
git branch -M main
git push -u origin main
```

### 2-3. GitHub Pages を有効化

1. GitHub リポジトリ → **Settings** → **Pages**
2. **Source** を **GitHub Actions** に変更
3. `main` ブランチへの push で自動デプロイされる（`.github/workflows/deploy.yml` が実行される）

### 2-4. 公開 URL

デプロイ完了後、以下の URL でアクセスできます：

```
https://<ユーザー名>.github.io/HomeGardenDiary/
```

> **確認方法:** リポジトリの **Actions** タブで、ワークフローの実行状況を確認できます。緑のチェックが付けばデプロイ成功です。

---

## 3. Google Cloud Platform 設定

### 3-1. プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 上部の **プロジェクト選択** → **新しいプロジェクト** をクリック
3. プロジェクト名: `HomeGardenDiary`（任意）
4. **作成** をクリック
5. 作成したプロジェクトが選択されていることを確認

### 3-2. API の有効化

1. 左メニュー → **API とサービス** → **ライブラリ**
2. 以下の 2 つの API を検索して、それぞれ **有効にする**：
   - **Google Sheets API**
   - **Google Drive API**

### 3-3. Google Auth Platform の設定

> **Note:** Google Cloud Console の UI は 2025 年以降「Google Auth Platform」に統合されています。

#### ブランディング

1. 左メニュー → **Google Auth Platform** → **ブランディング**
2. 以下を入力：
   - **アプリ名**: `HomeGardenDiary`
   - **ユーザーサポートメール**: 自分のメールアドレス
3. **保存**

#### 対象（ユーザータイプ）

1. 左メニュー → **Google Auth Platform** → **対象**
2. **外部** を選択
3. **テストユーザー** に自分（と家族）の Gmail アドレスを追加

#### データアクセス（スコープ設定）

1. 左メニュー → **Google Auth Platform** → **データアクセス**
2. **スコープを追加または削除** ボタンをクリック
3. 「選択したスコープの更新」パネルが開く
4. 下部の **スコープの手動追加** テキストエリアに、以下の 4 つをカンマ区切りで入力：
   ```
   https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/userinfo.profile
   ```
5. **テーブルに追加** をクリック
6. 4 つのスコープが上部に表示されたことを確認し、**更新** をクリック

> **注意:** 公開ステータスが「テスト」の場合、テストユーザーに登録した Google アカウントでのみログインできます。

### 3-4. OAuth クライアント ID の作成

1. 左メニュー → **Google Auth Platform** → **クライアント**
2. **＋ クライアントを作成** をクリック
3. 以下を設定：
   - **アプリケーションの種類**: `ウェブアプリケーション`
   - **名前**: `HomeGardenDiary Web`（任意）
4. **承認済みの JavaScript 生成元** に以下を追加：
   ```
   https://<ユーザー名>.github.io
   ```
   開発時は以下も追加：
   ```
   http://localhost:5173
   ```
5. **承認済みのリダイレクト URI** に以下を追加：
   ```
   https://<ユーザー名>.github.io/HomeGardenDiary/
   ```
   開発時は以下も追加：
   ```
   http://localhost:5173/HomeGardenDiary/
   ```
6. **作成** をクリック
7. 表示される **クライアント ID** をコピーして控える

   ```
   例: 123456789-xxxxxxxxx.apps.googleusercontent.com
   ```

> **重要:** クライアント ID はアプリ内の設定画面とログイン画面で使用します。シークレットは使いません（ブラウザ完結型のため）。

---

## 4. Google スプレッドシート作成

### 4-1. スプレッドシートを作成

1. [Google Sheets](https://sheets.google.com/) で **新しいスプレッドシート** を作成
2. スプレッドシート名: `HomeGardenDiary`（任意）

### 4-2. スプレッドシート ID を控える

URL から ID 部分をコピーします：

```
https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
```

例: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

### 4-3. シートの初期化

シートの作成・ヘッダー設定は **手動で行う必要はありません**。
アプリ内の設定画面で「シートを初期化」ボタンを押すと、以下の 6 シートが自動で作成されます：

| シート名 | 用途 |
|----------|------|
| `planters` | 栽培区画データ |
| `activity_logs` | 作業記録 |
| `weather_data` | 気象データ（GAS が書き込み） |
| `soil_sensor_data` | 土壌センサデータ（GAS が書き込み） |
| `settings` | アプリ設定 |
| `harvest_summary` | 収穫サマリー（GAS が集計） |

### 4-4. 共有設定（家族と使う場合）

1. スプレッドシートの **共有** ボタンをクリック
2. 家族の Gmail アドレスを入力し、**編集者** 権限で追加

---

## 5. アプリ内の初期設定

### 5-1. アプリにアクセス

デプロイ済みの URL（`https://<ユーザー名>.github.io/HomeGardenDiary/`）、
または `npm run dev` で起動したローカル環境にアクセスします。

### 5-2. ログイン画面で Client ID を入力

1. ログイン画面が表示されます
2. **Google Client ID** 欄に、3-4 で控えた クライアント ID を入力
3. **Google でログイン** ボタンをクリック
4. Google の認証画面でアカウントを選択して許可

> **初回のみ:** 「このアプリは Google で確認されていません」と表示される場合は、
> **詳細** → **HomeGardenDiary（安全ではないページ）に移動** をクリックしてください。
> （GCP で OAuth 同意画面が「テスト」ステータスのため表示されます）

### 5-3. 設定画面で初期設定

ログイン後、下部ナビの **⚙ 設定** をタップして設定画面を開きます。

| 設定項目 | 操作 |
|---------|------|
| **Google OAuth Client ID** | ログイン時に入力済み。変更がなければそのまま |
| **スプレッドシート ID** | 4-2 で控えた ID を入力 |
| **シートを初期化** ボタン | クリックして 6 シートを自動作成 |
| **フォルダを自動作成** ボタン | クリックして Google Drive に写真保存用フォルダを自動作成 |
| **ダークモード** | お好みで設定 |

最後に **設定を保存** ボタンを押して完了です。

> **設定の保存先:** これらの設定はブラウザの `localStorage` に保存されます。
> デバイスやブラウザごとに 1 回設定すれば、次回以降は自動で読み込まれます。
> 別のデバイスで使う場合は、そのデバイスでも同じ設定を入力してください。

---

## 6. 動作確認

設定完了後、以下を試して正常に動作するか確認します：

1. **ダッシュボード** — トップ画面が表示される
2. **栽培区画登録** — プランター一覧 → 新規追加で登録できる
3. **作業記録** — 記録ボタンから水やりなどを登録できる
4. **写真アップロード** — 作業記録に写真を添付して保存できる
5. **スプレッドシート確認** — Google Sheets を直接開いて、データが書き込まれている

---

## 7. GAS 設定（気象データ自動取得・土壌センサ受信）

> 気象データの自動取得と土壌センサデータ受信のための設定です。Phase 2 で実装済み。

### 7-1. Apps Script を開く

1. スプレッドシートを開く
2. メニュー → **拡張機能** → **Apps Script**

### 7-2. スクリプトを配置

`gas/` フォルダ内の以下のファイルの内容を Apps Script エディタにコピー：

| ファイル | 用途 |
|---------|------|
| `weather-fetcher.gs` | Open-Meteo API から気象データを取得 |
| `soil-sensor-receiver.gs` | 土壌センサの HTTP POST を受信 |
| `triggers-setup.gs` | 時間トリガーの設定 |

### 7-3. 定数を設定

スクリプト内の以下の定数を自分の環境に合わせて編集：

```javascript
const SPREADSHEET_ID = '自分のスプレッドシートID';
const LATITUDE = 35.6812;       // 緯度（自宅の緯度）
const LONGITUDE = 139.7671;     // 経度（自宅の経度）
const TIMEZONE = 'Asia/Tokyo';  // タイムゾーン
const API_KEY = '任意のキー';    // 土壌センサ受信用 API キー
```

### 7-4. トリガーを登録

1. Apps Script エディタで `setupTriggers` 関数を選択
2. **▶ 実行** をクリック
3. Google アカウントの権限を許可

これにより、毎日 5:00〜6:00（GAS の仕様により指定時間帯内でランダム実行）に気象データが自動取得されます。

> **初回セットアップ時:** `fetchPastYearWeather` 関数を手動実行すると、過去1年分の気象データを一括取得できます。
> シートのデータが反映されない場合は、ブラウザで Google Sheets をリロードしてください。

### 7-5. 土壌センサ受信用 Web App のデプロイ

1. Apps Script エディタ → **デプロイ** → **新しいデプロイ**
2. 種類: **ウェブアプリ**
3. アクセスできるユーザー: **全員**
4. **デプロイ** をクリック
5. 表示される URL をセンサデバイスの送信先に設定

---

## 8. トラブルシューティング

### ログインできない

| 症状 | 対処 |
|------|------|
| 「popup_closed_by_user」エラー | ブラウザのポップアップブロックを解除してください |
| 「invalid_client」エラー | Client ID が正しいか確認してください |
| 「access_denied」エラー | GCP のテストユーザーに自分の Gmail が追加されているか確認してください |
| 認証画面が表示されない | ブラウザのサードパーティ Cookie がブロックされていないか確認してください |

### スプレッドシートにアクセスできない

| 症状 | 対処 |
|------|------|
| 403 エラー | スプレッドシートの共有設定で、ログインした Google アカウントに編集権限があるか確認 |
| 404 エラー | スプレッドシート ID が正しいか確認 |
| シートが見つからない | 設定画面で「シートを初期化」ボタンを実行してください |

### 写真がアップロードできない

| 症状 | 対処 |
|------|------|
| ドライブ API エラー | GCP で Google Drive API が有効になっているか確認 |
| フォルダ ID が空 | 設定画面で「フォルダを自動作成」ボタンを実行してください |

### GitHub Pages にデプロイできない

| 症状 | 対処 |
|------|------|
| Actions が実行されない | リポジトリの Settings → Pages → Source が「GitHub Actions」になっているか確認 |
| ビルドエラー | Actions タブでログを確認。`npm run build` がローカルで成功することを確認 |
| 404 が表示される | `vite.config.ts` の `base` が `/HomeGardenDiary/` になっているか確認 |
