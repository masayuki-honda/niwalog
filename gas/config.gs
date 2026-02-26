/**
 * config.gs
 *
 * GAS の Script Properties を使った設定管理。
 * SPREADSHEET_ID や API キーなどの機密情報・環境固有の設定を
 * コードから分離し、Script Properties に保存する。
 *
 * Script Properties は GAS プロジェクトに紐づくキーバリューストアで、
 * clasp push でコードを更新しても上書きされない。
 *
 * 設定方法（いずれかを選択）:
 *   A) GAS エディタ →「プロジェクトの設定」→「スクリプト プロパティ」で手動追加
 *   B) initScriptProperties() の値を書き換えて GAS エディタから実行
 *
 * 必要なプロパティ:
 *   - SPREADSHEET_ID     : Google スプレッドシートの ID（必須）
 *   - LATITUDE           : 緯度（デフォルト: 35.6762）
 *   - LONGITUDE          : 経度（デフォルト: 139.6503）
 *   - TIMEZONE           : タイムゾーン（デフォルト: Asia/Tokyo）
 *   - OPEN_METEO_API_KEY : Open-Meteo 有料プラン API キー（任意）
 *   - SENSOR_API_KEY     : 土壌センサー Web App 認証用キー（センサー使用時のみ必須）
 */

// ===== 設定ヘルパー（他ファイルから呼び出される） =====

/**
 * Script Property を取得する（未設定時はデフォルト値を返す）。
 * @param {string} key - プロパティ名
 * @param {string} [defaultValue=''] - デフォルト値
 * @returns {string}
 */
function getConfig_(key, defaultValue) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return (value !== null && value !== '') ? value : (defaultValue || '');
}

/**
 * 必須 Script Property を取得する（未設定時はエラー）。
 * @param {string} key - プロパティ名
 * @returns {string}
 */
function getRequiredConfig_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (value === null || value === '') {
    throw new Error(
      `Script Property "${key}" が未設定です。` +
      'GAS エディタの「プロジェクトの設定」→「スクリプト プロパティ」で設定するか、' +
      'initScriptProperties() を編集して実行してください。'
    );
  }
  return value;
}

// ===== セットアップ・確認用（GAS エディタから手動実行） =====

/**
 * Script Properties を一括設定する。
 *
 * 使い方:
 * 1. 下記の値を自分の環境に合わせて書き換える
 * 2. GAS エディタからこの関数を実行する
 * 3. 値は Script Properties に保存されるため、
 *    clasp push でコードが元に戻っても設定は残る
 *
 * ⚠ この関数はあくまで初期設定用のヘルパーです。
 *   GAS エディタの「プロジェクトの設定」→「スクリプト プロパティ」から
 *   GUI で設定することもできます。
 */
function initScriptProperties() {
  const config = {
    // === 必須 ===
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',

    // === 気象データ取得（weather-fetcher.gs） ===
    LATITUDE: '35.6762',       // 緯度（例: 東京）
    LONGITUDE: '139.6503',     // 経度（例: 東京）
    TIMEZONE: 'Asia/Tokyo',    // タイムゾーン

    // === Open-Meteo API（任意） ===
    // 有料プランのキーを設定すると専用サーバー経由になり
    // 共有 IP のレート制限を回避できる（未設定なら空文字列のまま）
    OPEN_METEO_API_KEY: '',

    // === 土壌センサー（センサー使用時のみ必須） ===
    SENSOR_API_KEY: 'YOUR_SECRET_API_KEY',
  };

  PropertiesService.getScriptProperties().setProperties(config);

  Logger.log('Script Properties を設定しました:');
  Logger.log(Object.keys(config).join(', '));
  Logger.log('showConfig() で確認できます。');
}

/**
 * 現在の Script Properties をログに出力する（値はマスク表示）。
 * デバッグ・確認用。GAS エディタから手動実行すること。
 */
function showConfig() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const keys = Object.keys(props).sort();

  if (keys.length === 0) {
    Logger.log('Script Properties が未設定です。initScriptProperties() を実行してください。');
    return;
  }

  Logger.log('=== Current Script Properties ===');
  for (const key of keys) {
    const val = props[key];
    const masked = val.length > 4
      ? val.substring(0, 4) + '****'
      : '****';
    Logger.log(`  ${key} = ${masked}`);
  }
}
