// ===== Planter (プランター) =====
export interface Planter {
  id: string;
  name: string;
  cropName: string;
  cropVariety: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'archived';
  imageFolderId: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Activity Log (作業記録) =====
export type ActivityType =
  | 'watering'
  | 'fertilizing'
  | 'harvest'
  | 'pruning'
  | 'planting'
  | 'seeding'
  | 'pest_control'
  | 'weeding'
  | 'thinning'
  | 'support'
  | 'observation'
  | 'other';

export interface ActivityLog {
  id: string;
  planterId: string;
  userName: string;
  activityType: ActivityType;
  activityDate: string;
  memo: string;
  quantity: number | null;
  unit: string;
  photoFileIds: string[];
  createdAt: string;
}

// ===== Weather Data (気象データ) =====
export interface WeatherData {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  tempAvg: number | null;
  precipitation: number | null;
  solarRadiation: number | null;
  humidityAvg: number | null;
  windSpeedMax: number | null;
  source: string;
  fetchedAt: string;
}

// ===== Soil Sensor Data (土壌センサデータ) =====
export interface SoilSensorData {
  id: string;
  planterId: string;
  measuredAt: string;
  vwc: number | null;
  soilTemp: number | null;
  ecBulk: number | null;
  ecPore: number | null;
  createdAt: string;
}

// ===== Settings (設定) =====
export interface AppSettings {
  latitude: string;
  longitude: string;
  timezone: string;
  ownerEmail: string;
  sharedEmails: string;
  spreadsheetId: string;
  driveFolderId: string;
}

// ===== Harvest Summary (収穫サマリー) =====
export interface HarvestSummary {
  year: number;
  month: number;
  planterId: string;
  cropName: string;
  totalQuantity: number;
  unit: string;
  count: number;
}

// ===== Google Drive Photo =====
export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailLink: string;
  webContentLink: string;
  createdTime: string;
}

// ===== Auth =====
export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}
