# GAS (Google Apps Script) スクリプト

HomeGardenDiary のバックグラウンドデータ収集を担当する GAS スクリプト群です。

## ファイル構成

| ファイル | 用途 |
|----------|------|
| `weather-fetcher.gs` | Open-Meteo API から気象データを毎日自動取得 |
| `soil-sensor-receiver.gs` | 土壌センサーからの HTTP POST を受信する Web App |
| `triggers-setup.gs` | トリガー設定・削除ユーティリティ |

## セットアップ手順

### 1. GAS プロジェクト作成

1. Google スプレッドシートを開く
2. メニュー「拡張機能」→「Apps Script」
3. 各 `.gs` ファイルの内容を Apps Script エディタにコピー

### 2. 定数を設定

**weather-fetcher.gs:**
- `SPREADSHEET_ID` — スプレッドシートのID
- `LATITUDE` / `LONGITUDE` — 気象データ取得地点の緯度・経度
- `TIMEZONE` — タイムゾーン（デフォルト: `Asia/Tokyo`）
- `OPEN_METEO_API_KEY` — （任意）Open-Meteo API キー。設定するとレート制限が緩和される

**Open-Meteo API キーの取得（推奨）:**

GAS はトリガー実行時に Google の共有サーバー IP を使うため、無料枠の IP ベースレート制限に引っかかりやすくなっています。
無料の API キーを取得して設定すると、この問題を回避できます。

1. https://open-meteo.com/en/pricing にアクセス
2. 「API Key」→「Sign Up」でアカウント作成（無料）
3. ダッシュボードで API キーをコピー
4. `weather-fetcher.gs` の `OPEN_METEO_API_KEY` に設定

> API キーなしでも使えますが、429 エラーが繰り返される場合はキーの設定を推奨します。
> スクリプトは 429 エラー時に自動リトライ（最大3回、指数バックオフ）を行います。

**soil-sensor-receiver.gs:**
- `SS_ID` — スプレッドシートのID
- `API_KEY` — センサーからのリクエスト認証用の秘密鍵

### 3. 気象データ取得トリガーの設定

1. Apps Script エディタで `triggers-setup.gs` を開く
2. `setupTriggers` 関数を選択して実行
3. 初回実行時に Google アカウントの承認を求められるので許可

### 4. 過去データの一括取得（任意）

1. `weather-fetcher.gs` の `fetchPastYearWeather` 関数を手動実行
2. 過去1年分の気象データが一括で取得される

### 5. 土壌センサ Web App のデプロイ

1. Apps Script エディタで「デプロイ」→「新しいデプロイ」
2. 種類: **ウェブアプリ**
3. 実行するユーザー: **自分**
4. アクセス: **全員**（APIキーで認証するため）
5. デプロイURLをコピーし、土壌センサーデバイスのHTTP POST先に設定

### 6. 土壌センサ受信テスト

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

## トリガー一覧

| トリガー | 関数 | スケジュール |
|----------|------|-------------|
| 時間トリガー | `fetchDailyWeather` | 毎日 5:00-6:00 |

## 注意事項

- GAS の実行時間制限は 6分/回。気象データ取得は数秒で完了するため問題ありません。
- Open-Meteo API は非商用利用では無料・無制限です。
- `weather-fetcher.gs` と `soil-sensor-receiver.gs` で `SPREADSHEET_ID` / `SS_ID` を同じ値に設定してください。
- 土壌センサ Web App の `API_KEY` は推測困難な文字列に設定してください。
