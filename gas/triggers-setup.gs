/**
 * triggers-setup.gs
 *
 * GAS トリガーを設定するスクリプト。
 * Apps Script エディタから setupTriggers() を一度手動実行すること。
 *
 * 設定されるトリガー:
 * - fetchDailyWeather: 毎日 5:00-6:00 に実行
 */

/**
 * すべてのトリガーを設定する。
 * 既存のトリガーは削除してから再設定する。
 */
function setupTriggers() {
  // 既存トリガーを削除
  clearAllTriggers();

  // 気象データ取得トリガー（毎日 5:00-6:00）
  ScriptApp.newTrigger('fetchDailyWeather')
    .timeBased()
    .everyDays(1)
    .atHour(5)
    .create();

  Logger.log('Triggers set up successfully:');
  Logger.log('- fetchDailyWeather: daily at 5:00-6:00');
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
