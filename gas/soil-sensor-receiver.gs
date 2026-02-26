/**
 * soil-sensor-receiver.gs
 *
 * GAS Web App として公開し、土壌センサーからの HTTP POST を受信して
 * Google スプレッドシートの soil_sensor_data シートに書き込む。
 *
 * 使い方:
 * 1. このスクリプトを Google Apps Script エディタにコピー（または clasp push）
 * 2. config.gs の手順に従い Script Properties を設定
 * 3. 「デプロイ」→「新しいデプロイ」→ 種類: ウェブアプリ
 *    - アクセス: 全員（セキュリティは api_key で確保）
 * 4. デプロイURLを土壌センサーのHTTP POST先に設定
 *
 * リクエスト形式:
 * POST JSON:
 * {
 *   "api_key": "your-secret-key",
 *   "planter_id": "p001",
 *   "data": [
 *     {
 *       "measured_at": "2026-02-18T10:00:00+09:00",
 *       "vwc": 32.5,
 *       "soil_temp": 18.3,
 *       "ec_bulk": 0.45,
 *       "ec_pore": 1.23
 *     }
 *   ]
 * }
 *
 * レスポンス:
 * { "success": true, "inserted": 1 }
 */

// ===== 定数 =====
// 機密情報・環境固有の設定は Script Properties で管理（config.gs 参照）

/** soil_sensor_data シート名 */
const SENSOR_SHEET_NAME = 'soil_sensor_data';

// ===== Web App エンドポイント =====

/**
 * HTTP POST リクエストを受信するハンドラ
 * @param {object} e - イベントオブジェクト
 * @returns {ContentService.TextOutput} JSONレスポンス
 */
function doPost(e) {
  try {
    // リクエストボディをパース
    const body = JSON.parse(e.postData.contents);

    // API キー認証
    if (body.api_key !== getRequiredConfig_('SENSOR_API_KEY')) {
      return jsonResponse({ success: false, error: 'Invalid API key' }, 403);
    }

    // バリデーション
    if (!body.planter_id) {
      return jsonResponse({ success: false, error: 'planter_id is required' }, 400);
    }
    if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
      return jsonResponse({ success: false, error: 'data array is required and must not be empty' }, 400);
    }

    // シート取得
    const sheet = getOrCreateSensorSheet();
    const now = new Date().toISOString();
    let inserted = 0;

    for (const record of body.data) {
      // 各レコードのバリデーション
      if (!record.measured_at) {
        Logger.log('Skipping record: missing measured_at');
        continue;
      }

      const id = generateId();
      const row = [
        id,                                 // id
        body.planter_id,                    // planter_id
        record.measured_at,                 // measured_at
        valueOrEmpty(record.vwc),           // vwc
        valueOrEmpty(record.soil_temp),     // soil_temp
        valueOrEmpty(record.ec_bulk),       // ec_bulk
        valueOrEmpty(record.ec_pore),       // ec_pore
        now,                                // created_at
      ];

      sheet.appendRow(row);
      inserted++;
    }

    Logger.log(`Inserted ${inserted} sensor record(s) for planter ${body.planter_id}`);
    return jsonResponse({ success: true, inserted: inserted });

  } catch (e) {
    Logger.log(`Error in doPost: ${e.message}`);
    return jsonResponse({ success: false, error: e.message }, 500);
  }
}

/**
 * HTTP GET リクエスト（ヘルスチェック用）
 */
function doGet() {
  return jsonResponse({
    status: 'ok',
    service: 'niwalog Soil Sensor Receiver',
    timestamp: new Date().toISOString(),
  });
}

// ===== シート操作 =====

/**
 * soil_sensor_data シートを取得（なければヘッダー付きで作成）
 */
function getOrCreateSensorSheet() {
  const ss = SpreadsheetApp.openById(getRequiredConfig_('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName(SENSOR_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SENSOR_SHEET_NAME);
    sheet.appendRow([
      'id', 'planter_id', 'measured_at', 'vwc', 'soil_temp',
      'ec_bulk', 'ec_pore', 'created_at',
    ]);
    Logger.log(`Created sheet: ${SENSOR_SHEET_NAME}`);
  }

  return sheet;
}

// ===== ユーティリティ =====

/**
 * JSON レスポンスを生成
 * @param {object} data - レスポンスボディ
 * @param {number} [statusCode] - HTTP ステータスコード（GAS Web App では実際のHTTPコードは変更不可だが記録用）
 */
function jsonResponse(data, statusCode) {
  if (statusCode && statusCode >= 400) {
    Logger.log(`Error response (${statusCode}): ${JSON.stringify(data)}`);
  }
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * UUID v4 風の一意ID（GAS にはcrypto.randomUUID がないため簡易実装）
 */
function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const sections = [8, 4, 4, 4, 12];
  return sections.map(len => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  }).join('-');
}

function valueOrEmpty(v) {
  return v != null ? v : '';
}
