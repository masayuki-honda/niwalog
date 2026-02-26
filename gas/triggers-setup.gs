/**
 * triggers-setup.gs
 *
 * GAS トリガーを設定するスクリプト。
 * Apps Script エディタから setupTriggers() を一度手動実行すること。
 *
 * 設定されるトリガー:
 * - fetchDailyWeather: 毎日 9:00-10:00 に実行
 *   （Open-Meteo の daily limit は UTC 0:00 = JST 9:00 にリセットされるため、直後に実行）
 */

/**
 * すべてのトリガーを設定する。
 * 既存のトリガーは削除してから再設定する。
 */
function setupTriggers() {
  // 既存トリガーを削除
  clearAllTriggers();

  // 気象データ取得トリガー（毎日 9:00-10:00 JST = UTC 0:00-1:00、daily limit リセット直後）
  ScriptApp.newTrigger('fetchDailyWeather')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log('Triggers set up successfully:');
  Logger.log('- fetchDailyWeather: daily at 9:00-10:00 (after daily limit reset)');
}

/**
 * すべてのプロジェクトトリガーを削除する。
 */
function clearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }
  Logger.log(`Cleared ${triggers.length} existing trigger(s).`);
}

/**
 * 登録済みトリガーの一覧をログに出力する。
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    Logger.log('No triggers registered.');
    return;
  }
  for (const trigger of triggers) {
    Logger.log(`- ${trigger.getHandlerFunction()} (${trigger.getEventType()})`);
  }
}
