import type { ActivityType } from '@/types';

export const APP_NAME = 'niwalog';
export const APP_TITLE = '家庭菜園日記';

// Google API Scopes
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Spreadsheet sheet names
export const SHEET_NAMES = {
  PLANTERS: 'planters',
  ACTIVITY_LOGS: 'activity_logs',
  WEATHER_DATA: 'weather_data',
  SOIL_SENSOR_DATA: 'soil_sensor_data',
  SETTINGS: 'settings',
  HARVEST_SUMMARY: 'harvest_summary',
} as const;

// Activity types with labels and icons
export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; emoji: string; color: string }
> = {
  watering: { label: '水やり', emoji: '💧', color: 'bg-blue-100 text-blue-700' },
  fertilizing: { label: '施肥', emoji: '🧪', color: 'bg-amber-100 text-amber-700' },
  harvest: { label: '収穫', emoji: '🌿', color: 'bg-green-100 text-green-700' },
  pruning: { label: '剪定', emoji: '✂️', color: 'bg-purple-100 text-purple-700' },
  planting: { label: '定植', emoji: '🌱', color: 'bg-emerald-100 text-emerald-700' },
  seeding: { label: '播種', emoji: '🫘', color: 'bg-yellow-100 text-yellow-700' },
  pest_control: { label: '病害虫対策', emoji: '🐛', color: 'bg-red-100 text-red-700' },
  weeding: { label: '除草', emoji: '🌾', color: 'bg-lime-100 text-lime-700' },
  thinning: { label: '間引き', emoji: '🪴', color: 'bg-teal-100 text-teal-700' },
  support: { label: '支柱立て', emoji: '🪵', color: 'bg-orange-100 text-orange-700' },
  observation: { label: '観察', emoji: '📸', color: 'bg-indigo-100 text-indigo-700' },
  other: { label: 'その他', emoji: '📝', color: 'bg-gray-100 text-gray-700' },
};

// Image compression settings
export const IMAGE_SETTINGS = {
  maxWidthOrHeight: 1280,
  maxSizeMB: 0.2,
  fileType: 'image/jpeg' as const,
  quality: 0.7,
  maxPhotosPerActivity: 5,
};

// Date format
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
export const DISPLAY_DATE_FORMAT = 'M月d日(E)';
export const DISPLAY_MONTH_FORMAT = 'yyyy年M月';
