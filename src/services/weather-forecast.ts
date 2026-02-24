/**
 * Open-Meteo Forecast API クライアント
 * 7日間の天気予報を取得し、作業アドバイスを生成する
 */

export interface ForecastDay {
  date: string;               // yyyy-MM-dd
  tempMax: number;
  tempMin: number;
  precipitation: number;       // mm
  precipitationProbability: number;  // %
  weatherCode: number;
  windSpeedMax: number;        // km/h
}

export interface WeatherForecast {
  days: ForecastDay[];
  fetchedAt: string;
}

export interface WorkAdvice {
  emoji: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Open-Meteo API から7日間の天気予報を取得
 */
export async function fetchWeatherForecast(
  latitude: string,
  longitude: string,
): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'weather_code',
      'wind_speed_10m_max',
    ].join(','),
    timezone: 'Asia/Tokyo',
    forecast_days: '7',
  });

  const res = await fetch(`${OPEN_METEO_FORECAST_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`天気予報の取得に失敗しました (${res.status})`);
  }

  const json = await res.json();
  const d = json.daily;

  const days: ForecastDay[] = d.time.map((date: string, i: number) => ({
    date,
    tempMax: d.temperature_2m_max[i],
    tempMin: d.temperature_2m_min[i],
    precipitation: d.precipitation_sum[i] ?? 0,
    precipitationProbability: d.precipitation_probability_max[i] ?? 0,
    weatherCode: d.weather_code[i] ?? 0,
    windSpeedMax: d.wind_speed_10m_max[i] ?? 0,
  }));

  return {
    days,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * WMO Weather Code → emoji + 日本語テキスト
 */
export function weatherCodeToInfo(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: '快晴' };
  if (code <= 3) return { emoji: '⛅', label: '晴れ時々曇' };
  if (code <= 48) return { emoji: '🌫️', label: '霧' };
  if (code <= 55) return { emoji: '🌦️', label: '小雨' };
  if (code <= 57) return { emoji: '🌧️', label: '霧雨' };
  if (code <= 65) return { emoji: '🌧️', label: '雨' };
  if (code <= 67) return { emoji: '🥶', label: '凍雨' };
  if (code <= 75) return { emoji: '❄️', label: '雪' };
  if (code <= 77) return { emoji: '🌨️', label: 'あられ' };
  if (code <= 82) return { emoji: '⛈️', label: '強雨' };
  if (code <= 86) return { emoji: '🌨️', label: '大雪' };
  if (code <= 99) return { emoji: '⛈️', label: '雷雨' };
  return { emoji: '🌤️', label: '不明' };
}

/**
 * 天気予報から作業アドバイスを自動生成
 */
export function generateWorkAdvices(forecast: WeatherForecast): WorkAdvice[] {
  const advices: WorkAdvice[] = [];
  const today = forecast.days[0];
  const tomorrow = forecast.days[1];

  if (!today) return advices;

  // 霜注意アラート
  if (today.tempMin <= 2) {
    advices.push({
      emoji: '🥶',
      title: '霜注意',
      description: `今日の最低気温 ${today.tempMin}℃。霜が降りる可能性があります。寒冷紗などで防寒対策を。`,
      priority: 'high',
    });
  } else if (tomorrow && tomorrow.tempMin <= 2) {
    advices.push({
      emoji: '🥶',
      title: '明日は霜に注意',
      description: `明日の最低気温 ${tomorrow.tempMin}℃。防寒対策を準備しましょう。`,
      priority: 'high',
    });
  }

  // 猛暑アラート
  if (today.tempMax >= 35) {
    advices.push({
      emoji: '🔥',
      title: '猛暑注意',
      description: `最高気温 ${today.tempMax}℃。日中の作業を避け、朝夕に水やりを。遮光ネットの検討も。`,
      priority: 'high',
    });
  } else if (today.tempMax >= 30) {
    advices.push({
      emoji: '☀️',
      title: '真夏日',
      description: `最高気温 ${today.tempMax}℃。水切れに注意し、朝の水やりをしっかりと。`,
      priority: 'medium',
    });
  }

  // 雨予報 → 水やり不要
  const rainyDaysAhead = forecast.days.filter(
    (d) => d.precipitationProbability > 60 || d.precipitation > 5,
  ).length;
  if (today.precipitationProbability > 60 || today.precipitation > 5) {
    advices.push({
      emoji: '🌧️',
      title: '雨予報 — 水やり不要',
      description: `今日は降水確率 ${today.precipitationProbability}%。水やりは控えて大丈夫です。`,
      priority: 'low',
    });
  } else if (rainyDaysAhead === 0 && today.tempMax > 25) {
    advices.push({
      emoji: '💧',
      title: '晴れ続き — 水やりを忘れずに',
      description: '今後7日間の雨予報なし。こまめな水やりが必要です。',
      priority: 'medium',
    });
  }

  // 強風アラート
  if (today.windSpeedMax > 40) {
    advices.push({
      emoji: '💨',
      title: '強風注意',
      description: `最大風速 ${today.windSpeedMax} km/h。支柱の補強やネットの固定を確認しましょう。`,
      priority: 'high',
    });
  }

  // 快晴で穏やかな日 → 作業日和
  if (
    today.precipitationProbability < 20 &&
    today.tempMax >= 15 &&
    today.tempMax <= 30 &&
    today.windSpeedMax < 30
  ) {
    advices.push({
      emoji: '🌿',
      title: '絶好の作業日和',
      description: `気温 ${today.tempMin}～${today.tempMax}℃、降水確率 ${today.precipitationProbability}%。外での作業に最適です！`,
      priority: 'low',
    });
  }

  // 優先度でソート
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  advices.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return advices;
}
