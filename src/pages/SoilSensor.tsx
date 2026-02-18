export function SoilSensor() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🌱 土壌センサーデータ</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-4xl mb-4">📡</p>
        <p className="text-gray-500 text-sm">
          土壌センサーデータ機能は Phase 3 で実装予定です
        </p>
        <p className="text-gray-400 text-xs mt-2">
          村田製作所 土壌センサー（VWC, 地温, EC_BULK, EC_PORE）のデータを
          GAS Web App 経由で自動記録します
        </p>
      </div>
    </div>
  );
}
