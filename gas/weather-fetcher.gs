/**
 * weather-fetcher.gs
 *
 * Open-Meteo API から前日の気象データを取得し、
 * Google スプレッドシートの weather_data シートに書き込む。
 *
 * 使い方:
 * 1. このスクリプトを Google Apps Script エディタにコピー
 * 2. 下記の定数を設定
 * 3. triggers-setup.gs の setupTriggers() を実行してトリガーを登録
 */

// ===== 定数（環境に合わせて変更） =====

/** スプレッドシートID */
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

/** 緯度（気象データ取得地点） */
const LATITUDE = '35.6762';     // 例: 東京

/** 経度（気象データ取得地点） */
const LONGITUDE = '139.6503';   // 例: 東京

/** タイムゾーン */
const TIMEZONE = 'Asia/Tokyo';

/** weather_data シート名 */
const WEATHER_SHEET_NAME = 'weather_data';

// ===== Open-Meteo API =====

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * 日次トリガーで呼ばれるメイン関数。
 * 前日の気象データを取得してシートに追加する。
 */
function fetchDailyWeather() {
  try {
    const data = fetchWeatherFromAPI(1); // past_days=1 で前日分を取得
    if (!data || data.length === 0) {
      Logger.log('No weather data returned.');
      return;
    }

    const sheet = getOrCreateWeatherSheet();
    appendWeatherRows(sheet, data);
    Logger.log(`Successfully added ${data.length} weather record(s).`);
  } catch (e) {
    Logger.log(`Error in fetchDailyWeather: ${e.message}`);
    throw e;
  }
}

/**
 * 初回セットアップ時に過去1年分の気象データを一括取得する。
 * Apps Script エディタから手動で実行すること。
 */
function fetchPastYearWeather() {
  try {
    // Open-Meteo の forecast エンドポイントは past_days パラメータで過去データを取得可能
    // ただし past_days の上限があるため、archive エンドポイントも併用
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const startDate = formatDateISO(oneYearAgo);
    const endDate = formatDateISO(new Date(today.getTime() - 86400000)); // 昨日まで

    const data = fetchWeatherFromArchiveAPI(startDate, endDate);
    if (!data || data.length === 0) {
      Logger.log('No weather data returned from archive.');
      return;
    }

    const sheet = getOrCreateWeatherSheet();

    // 既存データの日付を取得（重複防止）
    const existingDates = getExistingDates(sheet);
    Logger.log(`Existing records in sheet: ${existingDates.size}`);
    const newData = data.filter(row => !existingDates.has(row[0]));

    if (newData.length === 0) {
      Logger.log('All data already exists. No new records added.');
      return;
    }

    Logger.log(`API returned ${data.length} days, ${existingDates.size} already exist, ${newData.length} new to add.`);
    appendWeatherRows(sheet, newData);
    Logger.log(`Successfully added ${newData.length} weather record(s) from archive. Total rows in sheet: ${sheet.getLastRow() - 1}`);
  } catch (e) {
    Logger.log(`Error in fetchPastYearWeather: ${e.message}`);
    throw e;
  }
}

// ===== API呼び出し =====

/**
 * Open-Meteo Forecast API からデータ取得
 * @param {number} pastDays - 過去何日分を取得するか
 * @returns {string[][]} シートに追加する行データ
 */
function fetchWeatherFromAPI(pastDays) {
  const params = {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'precipitation_sum',
      'shortwave_radiation_sum',
      'relative_humidity_2m_mean',
      'wind_speed_10m_max',
    ].join(','),
    timezone: TIMEZONE,
    past_days: pastDays,
    forecast_days: 0,
  };

  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `${OPEN_METEO_BASE}?${queryString}`;
  Logger.log(`Fetching: ${url}`);

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = response.getResponseCode();

  if (code !== 200) {
    throw new Error(`Open-Meteo API returned HTTP ${code}: ${response.getContentText()}`);
  }

  const json = JSON.parse(response.getContentText());
  return parseDailyData(json);
}

/**
 * Open-Meteo Archive API から過去データを取得
 * @param {string} startDate - ISO date (yyyy-MM-dd)
 * @param {string} endDate - ISO date (yyyy-MM-dd)
 * @returns {string[][]} シートに追加する行データ
 */
function fetchWeatherFromArchiveAPI(startDate, endDate) {
  const archiveBase = 'https://archive-api.open-meteo.com/v1/archive';

  const params = {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'precipitation_sum',
      'shortwave_radiation_sum',
      'relative_humidity_2m_mean',
      'wind_speed_10m_max',
    ].join(','),
    timezone: TIMEZONE,
    start_date: startDate,
    end_date: endDate,
  };

  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `${archiveBase}?${queryString}`;
  Logger.log(`Fetching archive: ${url}`);

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = response.getResponseCode();

  if (code !== 200) {
    throw new Error(`Open-Meteo Archive API returned HTTP ${code}: ${response.getContentText()}`);
  }

  const json = JSON.parse(response.getContentText());
  return parseDailyData(json);
}

/**
 * Open-Meteo APIレスポンスの daily データをパースし、行データに変換
 * @param {object} json - APIレスポンス
 * @returns {string[][]} 行データ配列
 */
function parseDailyData(json) {
  const daily = json.daily;
  if (!daily || !daily.time || daily.time.length === 0) {
    return [];
  }

  const now = new Date().toISOString();
  const rows = [];

  for (let i = 0; i < daily.time.length; i++) {
    rows.push([
      daily.time[i],                                              // date
      valueOrEmpty(daily.temperature_2m_max?.[i]),                 // temp_max
      valueOrEmpty(daily.temperature_2m_min?.[i]),                 // temp_min
      valueOrEmpty(daily.temperature_2m_mean?.[i]),                // temp_avg
      valueOrEmpty(daily.precipitation_sum?.[i]),                  // precipitation
      valueOrEmpty(daily.shortwave_radiation_sum?.[i]),            // solar_radiation
      valueOrEmpty(daily.relative_humidity_2m_mean?.[i]),          // humidity_avg
      valueOrEmpty(daily.wind_speed_10m_max?.[i]),                 // wind_speed_max
      'open-meteo',                                                // source
      now,                                                         // fetched_at
    ]);
  }

  return rows;
}

// ===== シート操作 =====

/**
 * weather_data シートを取得（なければヘッダー付きで作成）
 */
function getOrCreateWeatherSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(WEATHER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(WEATHER_SHEET_NAME);
    sheet.appendRow([
      'date', 'temp_max', 'temp_min', 'temp_avg', 'precipitation',
      'solar_radiation', 'humidity_avg', 'wind_speed_max', 'source', 'fetched_at',
    ]);
    Logger.log(`Created sheet: ${WEATHER_SHEET_NAME}`);
  }

  return sheet;
}

/**
 * シートに行データを追加（重複日付をスキップ）
 */
function appendWeatherRows(sheet, rows) {
  const existingDates = getExistingDates(sheet);

  for (const row of rows) {
    const date = row[0];
    if (existingDates.has(date)) {
      Logger.log(`Skipping duplicate date: ${date}`);
      continue;
    }
    sheet.appendRow(row);
    existingDates.add(date);
  }
}

/**
 * 既存データの日付のセットを返す
 * 注意: Google Sheets は日付文字列を自動で Date 型に変換するため、
 *       getValues() は Date オブジェクトを返す。yyyy-MM-dd 形式に正規化して比較する。
 */
function getExistingDates(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return new Set(); // ヘッダーのみ

  const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return new Set(dates.map(r => {
    const v = r[0];
    if (v instanceof Date) {
      // Date オブジェクト → yyyy-MM-dd に変換
      return formatDateISO(v);
    }
    // 文字列の場合はそのまま（yyyy-MM-dd を想定）
    return String(v);
  }));
}

// ===== ユーティリティ =====

function valueOrEmpty(v) {
  return v != null ? v : '';
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
