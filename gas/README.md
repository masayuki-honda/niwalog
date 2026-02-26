# GAS (Google Apps Script) スクリプト

niwalog のバックグラウンドデータ収集を担当する GAS スクリプト群です。

## ファイル構成

| ファイル | 用途 |
|----------|------|
| `config.gs` | Script Properties を使った設定管理（機密情報の分離） |
| `weather-fetcher.gs` | Open-Meteo API から気象データを毎日自動取得 |
| `soil-sensor-receiver.gs` | 土壌センサーからの HTTP POST を受信する Web App |
| `triggers-setup.gs` | トリガー設定・削除ユーティリティ |
| `appsscript.json` | GAS プロジェクトのマニフェスト（clasp 管理） |
| `.clasp.json.example` | clasp 設定のテンプレート |
| `.claspignore` | clasp push 時の除外ファイル |

## セットアップ手順

### 1. clasp（GAS CLI）の初期セットアップ

clasp を使うと、ローカルで編集した `.gs` ファイルを `npm run gas:push` で GAS にデプロイできます。

```bash
# 1. clasp をグローバルインストール（Node.js 18〜20 推奨）
npm install -g @google/clasp

# 2. Google アカウントでログイン（ブラウザが開きます）
npm run gas:login

# 3. .clasp.json を作成（テンプレートをコピー）
cp gas/.clasp.json.example gas/.clasp.json

# 4. gas/.clasp.json の scriptId を自分の GAS プロジェクト ID に書き換え
#    GAS エディタの URL: https://script.google.com/home/projects/{SCRIPT_ID}/edit
#    の {SCRIPT_ID} 部分をコピーして設定
```

### 2. Script Properties を設定

機密情報・環境固有の設定は GAS の **Script Properties** で管理します。
Script Properties は GAS プロジェクトに紐づくキーバリューストアで、`clasp push` でコードを更新しても上書きされません。

**設定方法 A: GAS エディタの GUI で設定**

1. `npm run gas:open` で GAS エディタを開く
2. 左サイドバーの歯車アイコン（「プロジェクトの設定」）をクリック
3. 「スクリプト プロパティ」セクションで以下のプロパティを追加

**設定方法 B: セットアップ関数を実行**

1. GAS エディタで `config.gs` の `initScriptProperties()` 関数内の値を自分の環境に書き換える
2. `initScriptProperties()` を実行
3. 値は Script Properties に保存されるので、コードを元に戻しても設定は残る

**必要なプロパティ一覧:**

| プロパティ名 | 必須 | 説明 | デフォルト |
|---|---|---|---|
| `SPREADSHEET_ID` | ○ | Google スプレッドシートの ID | - |
| `LATITUDE` | | 緯度（気象データ取得地点） | `35.6762` |
| `LONGITUDE` | | 経度（気象データ取得地点） | `139.6503` |
| `TIMEZONE` | | タイムゾーン | `Asia/Tokyo` |
| `OPEN_METEO_API_KEY` | | Open-Meteo 有料プラン API キー | 空（無料枠） |
| `SENSOR_API_KEY` | △* | 土壌センサー認証用キー | - |

\* 土壌センサーを使用する場合のみ必須

> ℹ️ `showConfig()` を GAS エディタで実行すると、現在の設定値をマスク表示で確認できます。

**Open-Meteo API レート制限について:**

GAS はトリガー実行時に Google の共有サーバー IP を使うため、他のユーザーと合算されて
無料枠の IP ベースレート制限（10,000 calls/day）に引っかかる場合があります。

- Daily limit は **UTC 0:00（= JST 9:00）にリセット**されるため、トリガーはリセット直後の 9:00-10:00 に設定しています
- スクリプトは 429 エラー時に自動リトライ（最大3回、指数バックオフ）を行います
- 有料プランの API キーを Script Properties の `OPEN_METEO_API_KEY` に設定すると専用サーバー経由となり制限を回避できます（https://open-meteo.com/en/pricing）

**soil-sensor-receiver.gs:**
- `SENSOR_API_KEY` — Script Properties で設定（上記参照）

### 3. GAS へのデプロイ

```bash
# ローカルのコードを GAS に push
npm run gas:push

# GAS エディタをブラウザで開く
npm run gas:open

# GAS のコードをローカルに pull（GAS エディタで直接編集した場合）
npm run gas:pull
```

### 4. 気象データ取得トリガーの設定

1. `npm run gas:open` で GAS エディタを開く
2. `triggers-setup.gs` の `setupTriggers` 関数を選択して実行
3. 初回実行時に Google アカウントの承認を求められるので許可

### 5. 過去データの一括取得（任意）

1. GAS エディタで `weather-fetcher.gs` の `fetchPastYearWeather` 関数を手動実行
2. 過去1年分の気象データが一括で取得される

### 6. 土壌センサ Web App のデプロイ

1. GAS エディタで「デプロイ」→「新しいデプロイ」
2. 種類: **ウェブアプリ**
3. 実行するユーザー: **自分**
4. アクセス: **全員**（APIキーで認証するため）
5. デプロイURLをコピーし、土壌センサーデバイスのHTTP POST先に設定

### 7. 土壌センサ受信テスト

```bash
curl -X POST "https://script.google.com/macros/s/{DEPLOY_ID}/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_SECRET_API_KEY",
    "planter_id": "test-planter-01",
    "data": [
      {
        "measured_at": "2026-02-22T10:00:00+09:00",
        "vwc": 32.5,
        "soil_temp": 18.3,
        "ec_bulk": 0.45,
        "ec_pore": 1.23
      }
    ]
  }'
```

期待されるレスポンス:
```json
{ "success": true, "inserted": 1 }
```

## npm scripts

| コマンド | 説明 |
|----------|------|
| `npm run gas:push` | ローカルの GAS コードを Google Apps Script にデプロイ |
| `npm run gas:pull` | GAS のコードをローカルに取得 |
| `npm run gas:open` | GAS エディタをブラウザで開く |
| `npm run gas:login` | Google アカウントで clasp にログイン |

## トリガー一覧

| トリガー | 関数 | スケジュール |
|----------|------|-------------|
| 時間トリガー | `fetchDailyWeather` | 毎日 9:00-10:00（daily limit リセット直後） |

## 注意事項

- GAS の実行時間制限は 6分/回。気象データ取得は数秒で完了するため問題ありません。
- Open-Meteo API は非商用利用では無料（10,000 calls/day）です。
- 土壌センサ Web App の `SENSOR_API_KEY` は推測困難な文字列に設定してください。
- `gas/.clasp.json` はスクリプト ID を含むため `.gitignore` で除外されています。
- **機密情報（SPREADSHEET_ID、APIキー等）はコードにハードコードせず、Script Properties で管理してください。**
  `clasp push` でコードを更新しても Script Properties は上書きされません。
