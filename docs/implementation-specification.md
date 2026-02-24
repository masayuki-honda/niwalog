# HomeGardenDiary 実装仕様書

**バージョン:** 3.0
**作成日:** 2026年2月20日
**最終更新:** 2026年2月24日（Phase 3 分析機能完了）
**ステータス:** 確定
**対応設計仕様書:** design-specification.md v3.0

---

## 目次

1. [プロジェクト構成](#1-プロジェクト構成)
2. [依存パッケージ](#2-依存パッケージ)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [型定義](#4-型定義)
5. [状態管理](#5-状態管理)
6. [サービス層](#6-サービス層)
7. [ユーティリティ](#7-ユーティリティ)
8. [定数管理](#8-定数管理)
9. [認証フロー](#9-認証フロー)
10. [Google API 連携パターン](#10-google-api-連携パターン)
11. [コンポーネント設計指針](#11-コンポーネント設計指針)
12. [ページ実装指針](#12-ページ実装指針)
13. [エラーハンドリング](#13-エラーハンドリング)
14. [コーディング規約](#14-コーディング規約)
15. [ビルド・デプロイ](#15-ビルドデプロイ)
16. [未実装機能の追加手順](#16-未実装機能の追加手順)

---

## 1. プロジェクト構成

### 1.1 ビルドツール

| 項目 | 設定値 |
|------|--------|
| ビルドツール | Vite 7 |
| ベースパス | `/HomeGardenDiary/` |
| パスエイリアス | `@` → `./src` |
| TypeScript厳密モード | 有効 |

**vite.config.ts 概要:**

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/HomeGardenDiary/',   // GitHub Pages サブパス
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

> **注意:** `base` は GitHub Pages のリポジトリ名と一致させる。ローカル開発中は `/HomeGardenDiary/` プレフィックスが付くため、`vite preview` で確認する。

### 1.2 TypeScript 設定

- `tsconfig.json` - ワークスペース全体のルート設定（参照元）
- `tsconfig.app.json` - `src/` 配下のアプリコード（`strict: true`）
- `tsconfig.node.json` - `vite.config.ts` などビルドツール用

---

## 2. 依存パッケージ

### 2.1 本番依存

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `react` | ^19.2.0 | UIフレームワーク |
| `react-dom` | ^19.2.0 | DOMレンダリング |
| `react-router-dom` | ^7.6.1 | SPAルーティング |
| `zustand` | ^5.0.5 | グローバル状態管理 |
| `recharts` | ^2.15.0 | グラフ・チャート（Weather/SoilSensorページで使用） |
| `date-fns` | ^4.1.0 | 日付操作 |
| `date-fns-tz` | ^3.2.0 | タイムゾーン変換 |
| `exifr` | ^7.1.3 | EXIFデータ抽出（写真の日付・向き取得） |
| `lucide-react` | ^0.511.0 | アイコン |
| `browser-image-compression` | ^2.0.2 | クライアント画像圧縮 |
| `uuid` | ^11.1.0 | UUID生成（fallback用） |

### 2.2 開発依存

| パッケージ | 用途 |
|-----------|------|
| `typescript` ~5.9.3 | 型チェック |
| `@vitejs/plugin-react` | Vite React プラグイン |
| `tailwindcss` ^3.4.17 | ユーティリティCSS |
| `postcss` / `autoprefixer` | CSS後処理 |
| `eslint` + 各プラグイン | Lint |

### 2.3 外部スクリプト（`index.html` 経由で動的ロード）

Google のライブラリはバンドルせず、`google-auth.ts` が実行時に動的に DOM へ追加する。

| ライブラリ | ロード場所 | 用途 |
|-----------|-----------|------|
| `https://apis.google.com/js/api.js` (GAPI) | `loadGapiClient()` | Sheets / Drive REST 共通クライアント |
| `https://accounts.google.com/gsi/client` (GIS) | `loadGisClient()` | OAuth 2.0 トークン取得 |

---

## 3. ディレクトリ構成

```
src/
├── App.tsx                     # ルート・ルーティング・セッション復元
├── main.tsx                    # エントリポイント（BrowserRouter）
├── index.css                   # Tailwind ディレクティブ + グローバルスタイル
│
├── pages/                      # 画面コンポーネント（1ファイル = 1ルート）
│   ├── Login.tsx               # /login
│   ├── Dashboard.tsx           # / （天気サマリーカード含む）
│   ├── PlanterList.tsx         # /planters
│   ├── PlanterDetail.tsx       # /planters/:id
│   ├── ActivityForm.tsx        # /activities/new?planterId=xxx
│   ├── Calendar.tsx            # /calendar
│   ├── Weather.tsx             # /weather （Recharts 複合チャート + 4タブ）
│   ├── SoilSensor.tsx          # /soil-sensor?planterId=xxx
│   ├── Analytics.tsx           # /analytics
│   ├── Review.tsx              # /review
│   ├── PhotoGallery.tsx        # /photos
│   └── Settings.tsx            # /settings
│
├── components/
│   ├── DriveImage.tsx          # Google Drive 画像表示コンポーネント
│   └── layout/
│       ├── AppLayout.tsx       # ヘッダー + サイドバー/ボトムナビ のラッパー
│       ├── Header.tsx          # ページ上部ヘッダー
│       ├── Sidebar.tsx         # PC用左サイドバー（土壌センサーリンク含む）
│       └── BottomNav.tsx       # モバイル用下部ナビゲーション
│
├── services/                   # 外部API通信（副作用のある処理はここに集約）
│   ├── google-auth.ts          # GAPI/GIS 初期化・トークン管理
│   ├── sheets-api.ts           # Sheets API ラッパー（weather/soil取得含む）
│   └── drive-api.ts            # Drive API ラッパー
│
├── stores/
│   └── app-store.ts            # Zustand グローバルストア
│
├── types/
│   ├── index.ts                # アプリ共通型定義
│   └── google.d.ts             # google.accounts / gapi の型宣言
│
├── constants/
│   └── index.ts                # アプリ全体で使う定数
│
└── utils/
    ├── index.ts                # 汎用ユーティリティ関数
    ├── auth-retry.ts           # 401時トークンリフレッシュ + リトライ
    ├── image-compressor.ts     # 画像圧縮
    ├── date-imports.ts         # date-fns / date-fns-tz の re-export
    └── correlation.ts          # 統計ユーティリティ（ピアソン相関係数、GDD計算）
```

---

## 4. 型定義

**ファイル:** `src/types/index.ts`

### 4.1 エンティティ型

#### `Planter`

```typescript
export interface Planter {
  id: string;           // UUID
  name: string;         // 栽培区画名
  cropName: string;     // 作物名
  cropVariety: string;  // 品種
  location: string;     // 設置場所
  startDate: string;    // ISO date (yyyy-MM-dd)
  endDate: string;      // ISO date | ''
  status: 'active' | 'archived';
  imageFolderId: string; // Google Drive フォルダID
  memo: string;
  createdAt: string;    // ISO datetime
  updatedAt: string;    // ISO datetime
}
```

#### `ActivityLog`

```typescript
export type ActivityType =
  | 'watering' | 'fertilizing' | 'harvest' | 'pruning'
  | 'planting' | 'seeding' | 'pest_control' | 'weeding'
  | 'thinning' | 'support' | 'observation' | 'other';

export interface ActivityLog {
  id: string;
  planterId: string;
  userName: string;
  activityType: ActivityType;
  activityDate: string;   // ISO date
  memo: string;
  quantity: number | null;
  unit: string;
  photoFileIds: string[]; // Google Drive ファイルID 配列
  createdAt: string;      // ISO datetime
}
```

#### `WeatherData`

```typescript
export interface WeatherData {
  date: string;               // ISO date
  tempMax: number | null;
  tempMin: number | null;
  tempAvg: number | null;
  precipitation: number | null;
  solarRadiation: number | null;
  humidityAvg: number | null;
  windSpeedMax: number | null;
  source: string;
  fetchedAt: string;          // ISO datetime
}
```

#### `SoilSensorData`

```typescript
export interface SoilSensorData {
  id: string;
  planterId: string;
  measuredAt: string;         // ISO datetime
  vwc: number | null;
  soilTemp: number | null;
  ecBulk: number | null;
  ecPore: number | null;
  createdAt: string;          // ISO datetime
}
```

#### `AppSettings`

```typescript
export interface AppSettings {
  latitude: string;
  longitude: string;
  timezone: string;
  ownerEmail: string;
  sharedEmails: string;       // カンマ区切り
  spreadsheetId: string;
  driveFolderId: string;
}
```

#### `HarvestSummary` / `DrivePhoto` / `AuthUser`

```typescript
export interface HarvestSummary {
  year: number; month: number; planterId: string;
  cropName: string; totalQuantity: number; unit: string; count: number;
}
export interface DrivePhoto {
  id: string; name: string;
  thumbnailLink: string; webContentLink: string; createdTime: string;
}
export interface AuthUser {
  email: string; name: string; picture: string; accessToken: string;
}
```

### 4.2 Google API 型宣言

**ファイル:** `src/types/google.d.ts`

`google.accounts.oauth2` および `gapi` のグローバル型を declare する。外部 `@types/gapi` パッケージは使用せず、必要な型をプロジェクト内で管理する。

---

## 5. 状態管理

**ファイル:** `src/stores/app-store.ts`

Zustand + `persist` ミドルウェアを使用。

### 5.1 ストア構造

```typescript
interface AppState {
  // ── 認証 ──────────────────────────────
  user: AuthUser | null;          // ログインユーザー（persistされる）
  setUser(user: AuthUser | null): void;
  isInitializing: boolean;        // 起動時セッション復元中フラグ
  setIsInitializing(v: boolean): void;

  // ── 設定（persist） ────────────────────
  googleClientId: string;
  setGoogleClientId(id: string): void;
  spreadsheetId: string;
  setSpreadsheetId(id: string): void;
  driveFolderId: string;
  setDriveFolderId(id: string): void;

  // ── データキャッシュ ───────────────────
  planters: Planter[];
  setPlanters(planters: Planter[]): void;
  addPlanter(planter: Planter): void;
  updatePlanter(planter: Planter): void;

  activities: ActivityLog[];
  setActivities(activities: ActivityLog[]): void;
  addActivity(activity: ActivityLog): void;
  removeActivity(id: string): void;

  // ── UI ────────────────────────────────
  darkMode: boolean;
  setDarkMode(dark: boolean): void;
  toggleDarkMode(): void;
  loading: boolean;
  setLoading(loading: boolean): void;
  error: string | null;
  setError(error: string | null): void;
}
```

### 5.2 永続化対象

`localStorage` のキー名: `home-garden-diary`

| フィールド | 永続化 | 理由 |
|-----------|:------:|------|
| `user` | ✅ | セッション復元 |
| `googleClientId` | ✅ | 設定画面で入力後も保持 |
| `spreadsheetId` | ✅ | 設定画面で入力後も保持 |
| `driveFolderId` | ✅ | 設定画面で入力後も保持 |
| `darkMode` | ✅ | テーマ設定を保持 |
| `planters` | ❌ | 毎回APIから取得 |
| `activities` | ❌ | 毎回APIから取得 |
| `loading` / `error` | ❌ | UI一時状態 |

### 5.3 WeatherData / SoilSensorData の扱い

現時点でストアに格納しない。各ページコンポーネントが `useState` + `useEffect` でローカル管理し、必要に応じてAPIから取得する。

---

## 6. サービス層

### 6.1 google-auth.ts

**責務:** GAPI クライアントおよび GIS の初期化・トークン管理

| 関数 | 説明 |
|------|------|
| `loadGapiClient()` | `api.js` スクリプトを動的ロードし `gapi.client.init()` を呼ぶ。二重ロード防止あり |
| `loadGisClient(clientId)` | `gsi/client` スクリプトを動的ロード。clientId 変更時は tokenClient を再初期化 |
| `requestAccessToken()` | GIS ポップアップを開き `TokenResponse` を返す Promise |
| `setGapiAccessToken(token)` | `gapi.client.setToken()` で既存トークンをセット（セッション復元時） |
| `verifyAccessToken(token)` | `tokeninfo` エンドポイントでトークンの有効性を確認 |
| `refreshAccessToken()` | `requestAccessToken()` を呼び直し新トークンを返す |

**設計上の注意:**

- GIS の `error_callback` はインスタンス生成時にしか登録できないため、モジュールスコープの `tokenErrorCallback` 変数へ委譲するパターンを採用。
- `tokenClient` は `loadGisClient()` を呼ぶたびに不変。clientId が変わった場合のみ `initializeTokenClient()` で再作成。

### 6.2 sheets-api.ts

**責務:** Google Sheets API v4 への HTTP リクエスト

#### 低レイヤー関数

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `fetchSheets` | `(url, token, options?)` | 共通 fetch ラッパー。401/エラー時に `Error` をスロー |
| `getSheetData` | `(spreadsheetId, sheetName, token)` | 指定シートの全行を `string[][]` で返す |
| `appendRows` | `(spreadsheetId, sheetName, rows, token)` | シート末尾に行を追加 |
| `updateRow` | `(spreadsheetId, sheetName, rowIndex, row, token)` | 指定 1-based 行番号を上書き |
| `deleteRow` | `(spreadsheetId, sheetName, rowIndex, token)` | `batchUpdate` → `deleteDimension` で物理削除 |
| `findRowIndex` | `(spreadsheetId, sheetName, id, token)` | ID列(A列)で行番号を検索、1-based を返す |

#### エンティティ別関数

| 関数 | 操作 |
|------|------|
| `getPlanters` | planters シート全行取得→生配列返却 |
| `addPlanter` | planters シート末尾に追加 |
| `getActivities` | activity_logs シート全行取得 |
| `addActivity` | activity_logs シート末尾に追加 |
| `getWeatherData` | weather_data シートからヘッダー行を除いた全データ行を返却（Phase 2 追加） |
| `getSoilSensorData` | soil_sensor_data シートからヘッダー行を除いた全データ行を返却（Phase 2 追加） |
| `getSettings` | settings シートを `Record<string, string>` にパース |
| `initializeSpreadsheet` | 6シートのヘッダー行を一括初期化（初回セットアップ） |

#### シート↔型変換規則

シートは全て文字列として値を保持するため、エンティティ型への変換はページ/フック側で行う。

**planters シート列順:**

```
[id, name, cropName, cropVariety, location, startDate, endDate,
 status, imageFolderId, memo, createdAt, updatedAt]
 0    1     2          3            4         5           6
 7      8               9     10         11
```

**activity_logs シート列順:**

```
[id, planterId, userName, activityType, activityDate, memo,
 quantity, unit, photoFileIds(comma-sep), createdAt]
  0    1          2          3              4             5
  6        7     8                          9
```

### 6.3 drive-api.ts

**責務:** Google Drive API v3 への HTTP リクエスト

| 関数 | 説明 |
|------|------|
| `createFolder(name, parentId, token)` | フォルダ作成。`parentId=null` でマイドライブ直下 |
| `uploadFile(file, fileName, folderId, token)` | multipart アップロード。`{id, webContentLink, thumbnailLink}` を返す |
| `listFiles(folderId, token)` | フォルダ内ファイル一覧（新しい順） |
| `getFileLink(fileId, token)` | ファイルの thumbnail/download URL を取得 |
| `deleteFile(fileId, token)` | ファイル削除 |
| `ensureAppFolder(token)` | `HomeGardenDiary` フォルダが存在すれば ID を返し、なければ作成して返す |

---

## 7. ユーティリティ

### 7.1 utils/index.ts

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `formatDate` | `(dateStr, fmt?)` | ISO日付文字列を日本語フォーマットで表示 |
| `daysSince` | `(dateStr)` | 日付からの経過日数 |
| `generateId` | `()` | `crypto.randomUUID()` or フォールバック |
| `nowISO` | `()` | 現在時刻の ISO 文字列 |
| `todayStr` | `()` | 今日の日付 `yyyy-MM-dd` |
| `cn` | `(...classes)` | 条件付きクラス結合（clsx 相当） |
| `parsePhotoIds` | `(idsStr)` | カンマ区切り文字列 → 配列 |
| `joinPhotoIds` | `(ids)` | 配列 → カンマ区切り文字列 |

### 7.2 utils/auth-retry.ts

```typescript
export async function withAuthRetry<T>(
  fn: (accessToken: string) => Promise<T>
): Promise<T>
```

- API呼び出し関数 `fn` を実行し、401エラー発生時に 1回だけトークンリフレッシュしてリトライ。
- リフレッシュ成功時はストアの `user.accessToken` も更新。
- **使用例:**

```typescript
const result = await withAuthRetry((token) =>
  uploadFile(blob, fileName, folderId, token)
);
```

### 7.3 utils/image-compressor.ts

```typescript
export async function compressImage(file: File): Promise<Blob>
```

`browser-image-compression` を使用。設定値は `constants/index.ts` の `IMAGE_SETTINGS` から取得:

- `maxWidthOrHeight`: 1280px
- `maxSizeMB`: 0.2 (約200KB)
- `fileType`: `image/jpeg`
- `initialQuality`: 0.7

### 7.4 utils/date-imports.ts

`date-fns` と `date-fns-tz` の必要な関数を1箇所で re-export。直接 `date-fns` から import するのではなくこのファイルを通すことで、将来的なバージョン変更の影響を局所化する。

**現在の re-export 一覧:**

```typescript
export {
  format, parseISO, differenceInDays, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, addMonths, subMonths,
  subDays, getYear, getMonth, startOfYear, endOfYear,
} from 'date-fns';
export { ja } from 'date-fns/locale/ja';
```

---

## 8. 定数管理

**ファイル:** `src/constants/index.ts`

### 8.1 主要定数

```typescript
export const APP_NAME = 'HomeGardenDiary';
export const APP_TITLE = '家庭菜園日記';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');
```

### 8.2 SHEET_NAMES

```typescript
export const SHEET_NAMES = {
  PLANTERS: 'planters',
  ACTIVITY_LOGS: 'activity_logs',
  WEATHER_DATA: 'weather_data',
  SOIL_SENSOR_DATA: 'soil_sensor_data',
  SETTINGS: 'settings',
  HARVEST_SUMMARY: 'harvest_summary',
} as const;
```

### 8.3 ACTIVITY_TYPE_CONFIG

各 `ActivityType` に対して `{ label: string; emoji: string; color: string }` を定義。`color` は Tailwind のクラス文字列（例: `"bg-blue-100 text-blue-700"`）。

### 8.4 IMAGE_SETTINGS

```typescript
export const IMAGE_SETTINGS = {
  maxWidthOrHeight: 1280,
  maxSizeMB: 0.2,
  fileType: 'image/jpeg' as const,
  quality: 0.7,
  maxPhotosPerActivity: 5,
};
```

### 8.5 日付フォーマット定数

```typescript
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
export const DISPLAY_DATE_FORMAT = 'M月d日(E)';
export const DISPLAY_MONTH_FORMAT = 'yyyy年M月';
```

---

## 9. 認証フロー

### 9.1 初回ログイン

```
[Login.tsx]
  1. ユーザーが「Googleでログイン」ボタンを押す
  2. loadGapiClient() → GAPI初期化
  3. loadGisClient(googleClientId) → GIS初期化・tokenClient作成
  4. requestAccessToken() → Googleポップアップ表示
  5. TokenResponse取得 → gapi.client.setToken()
  6. userinfo.v2.me API で email/name/picture 取得
  7. useAppStore.setUser({ email, name, picture, accessToken })
  8. Navigate to "/"
```

### 9.2 セッション復元（アプリ起動時）

`App.tsx` の `useRestoreSession()` フックが担当:

```
起動
  ↓
persist から user / googleClientId を復元
  ↓ user && accessToken && googleClientId が存在する場合
loadGapiClient() + loadGisClient(googleClientId)
  ↓
verifyAccessToken(user.accessToken)
  ↓
  有効 → setGapiAccessToken(token) → isInitializing = false
  無効 → refreshAccessToken()（GIS サイレント再認証）
         ↓ 成功: ストア更新 → isInitializing = false
         ↓ 失敗: setUser(null) → /login にリダイレクト
```

### 9.3 ProtectedRoute

```typescript
function ProtectedRoute({ children }) {
  // isInitializing 中はローディングスピナーを表示
  // user が null なら /login にリダイレクト
  // user が存在すれば children をレンダリング
}
```

### 9.4 トークン期限切れ対処（API呼び出し時）

`withAuthRetry()` でラップすることで、API呼び出し中に401が返った場合に自動でリフレッシュ＆リトライ（1回）する。

---

## 10. Google API 連携パターン

### 10.1 データ取得パターン

```typescript
// ページコンポーネント内
const [planters, setPlanters] = useState<Planter[]>([]);
const [loading, setLoading] = useState(false);
const user = useAppStore(s => s.user);
const spreadsheetId = useAppStore(s => s.spreadsheetId);

useEffect(() => {
  if (!user?.accessToken || !spreadsheetId) return;
  setLoading(true);
  withAuthRetry((token) => getPlanters(spreadsheetId, token))
    .then((rows) => setPlanters(rowsToPlanters(rows)))
    .catch((err) => console.error(err))
    .finally(() => setLoading(false));
}, [user?.accessToken, spreadsheetId]);
```

### 10.2 行データ⇔型変換

Sheets API から返る `string[][]` を型付きオブジェクトに変換する関数は、各ページまたは専用変換モジュールに配置する。

**planters 変換例:**

```typescript
function rowToPlanter(row: string[]): Planter {
  return {
    id: row[0], name: row[1], cropName: row[2],
    cropVariety: row[3], location: row[4],
    startDate: row[5], endDate: row[6],
    status: (row[7] as 'active' | 'archived') || 'active',
    imageFolderId: row[8], memo: row[9],
    createdAt: row[10], updatedAt: row[11],
  };
}

function planterToRow(p: Planter): (string | number | null)[] {
  return [
    p.id, p.name, p.cropName, p.cropVariety, p.location,
    p.startDate, p.endDate, p.status, p.imageFolderId,
    p.memo, p.createdAt, p.updatedAt,
  ];
}
```

**activity_logs 変換例:**

```typescript
function rowToActivity(row: string[]): ActivityLog {
  return {
    id: row[0], planterId: row[1], userName: row[2],
    activityType: row[3] as ActivityType,
    activityDate: row[4], memo: row[5],
    quantity: row[6] ? Number(row[6]) : null,
    unit: row[7],
    photoFileIds: parsePhotoIds(row[8]),
    createdAt: row[9],
  };
}

function activityToRow(a: ActivityLog): (string | number | null)[] {
  return [
    a.id, a.planterId, a.userName, a.activityType,
    a.activityDate, a.memo,
    a.quantity ?? '', a.unit,
    joinPhotoIds(a.photoFileIds),
    a.createdAt,
  ];
}
```

### 10.3 写真アップロードパターン

```typescript
// 1. ファイル選択
const files: File[] = ...; // input[type=file] から取得

// 2. 圧縮
const blobs = await Promise.all(files.map(compressImage));

// 3. フォルダ確保（初回のみ）
const activityFolderId = await withAuthRetry((token) =>
  ensureActivityFolder(driveFolderId, activityId, token)
);

// 4. アップロード
const uploadResults = await Promise.all(
  blobs.map((blob, i) => withAuthRetry((token) =>
    uploadFile(blob, `photo_${i}.jpg`, activityFolderId, token)
  ))
);

// 5. ファイルIDをActivityLogに保存
const photoFileIds = uploadResults.map(r => r.id);
```

### 10.4 weather_data / soil_sensor_data の取得

これらは GAS が書き込むため、SPA からは **読み取り専用**:

```typescript
const rows = await withAuthRetry((token) =>
  getSheetData(spreadsheetId, SHEET_NAMES.WEATHER_DATA, token)
);
const weatherData: WeatherData[] = rows.slice(1)
  .filter(r => r[0])
  .map(rowToWeatherData);
```

---

## 11. コンポーネント設計指針

### 11.1 ファイル配置ルール

| 種別 | 配置場所 | 備考 |
|------|---------|------|
| 画面コンポーネント | `pages/` | 1ファイル = 1ルート。チャートロジックも各ページ内に含む |
| レイアウト | `components/layout/` | AppLayout, Header, Sidebar, BottomNav |
| Google Drive画像 | `components/DriveImage.tsx` | CORS対応画像表示 |

> **Note:** 現時点では `components/charts/`, `components/ui/`, `components/planters/`, `components/activities/` ディレクトリは未作成。Phase 3 以降でコンポーネントの切り出しが必要になった場合に作成する。

### 11.2 props 設計

- ページ(`pages/`)コンポーネントは props を受け取らない（ルートパラメータは `useParams` で取得）。
- 共有コンポーネントは必要最小限の props を持つ。コールバックは `onXxx` 命名。
- `children` を受け取るコンポーネントは `React.ReactNode` 型を使用。

### 11.3 Tailwind CSS 使用方針

- クラスは `cn()` ユーティリティで条件付き結合。
- `dark:` プレフィックスでダークモードに対応。
- `garden-*` カスタムカラーは `tailwind.config.js` で定義。

### 11.4 DriveImage コンポーネント

Google Drive の画像は通常の `<img src>` では CORS制限で表示できない場合がある。`DriveImage.tsx` コンポーネントを介して表示する。

```typescript
<DriveImage
  fileId="DRIVE_FILE_ID"
  accessToken={user.accessToken}
  className="w-full h-48 object-cover"
/>
```

---

## 12. ページ実装指針

### 12.1 ルーティング定義 (App.tsx)

```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route index element={<Dashboard />} />
    <Route path="planters" element={<PlanterList />} />
    <Route path="planters/:id" element={<PlanterDetail />} />
    <Route path="activities/new" element={<ActivityForm />} />
    <Route path="calendar" element={<Calendar />} />
    <Route path="weather" element={<Weather />} />
    <Route path="soil-sensor" element={<SoilSensor />} />
    <Route path="analytics" element={<Analytics />} />
    <Route path="review" element={<Review />} />
    <Route path="photos" element={<PhotoGallery />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Routes>
```

### 12.2 各ページの責務

| ページ | 主な責務 |
|--------|---------|
| `Login` | GAPI/GIS初期化・OAuth認証・ストア更新 |
| `Dashboard` | planters / activities / weather を取得して概要表示。天気サマリーカード（気温・降水量・日射量）含む |
| `PlanterList` | planters 一覧・フィルタ・新規登録ナビゲーション |
| `PlanterDetail` | 単一プランター詳細・タイムライン・タブ切替 |
| `ActivityForm` | 作業記録の新規作成（クエリパラメータ `planterId` で事前選択） |
| `Calendar` | activities を月間カレンダーにオーバーレイ表示 |
| `Weather` | weather_data を Recharts ComposedChart で表示。4タブ（概要/気温/降水量/日射量）、期間フィルタ（1w/1m/3m/1y/all）、StatCard、データテーブル |
| `SoilSensor` | soil_sensor_data を Recharts で表示。4タブ（概要/VWC/地温/EC）、プランター選択、期間フィルタ（1d/1w/1m/3m/all）、VWC閾値ライン（DRY=20%/WET=45%）|
| `Analytics` | 3タブ構成（収穫/相関分析/積算温度）。収穫ダッシュボード（月別・年別・作物別）、相関分析（気温×収穫・日射×収穫・降水×VWC・オーバーレイ）、GDD積算温度計算・グラフ |
| `Review` | 月次・年次サマリーレポート |
| `PhotoGallery` | Drive の全写真を時系列表示 |
| `Settings` | googleClientId / spreadsheetId / driveFolderId の登録・編集 |

### 12.3 Settings ページの特別な役割

アプリを使い始める前に必ず設定が必要な値を入力する画面:

1. **Google Client ID** — GCP で発行した OAuth クライアントID
2. **スプレッドシートID** — Google スプレッドシートのURL中の ID
3. **Drive フォルダID** — `HomeGardenDiary` フォルダの ID

これらは `useAppStore` に `persist` で保存されるため、再入力不要。

---

## 13. エラーハンドリング

### 13.1 基本方針

- API エラー（`services/` 層）は `Error` をスローし、呼び出し元（ページ）でキャッチして `useAppStore.setError()` または ローカル state でユーザーに通知する。
- 認証エラー（401）は `withAuthRetry` が自動リトライするため、ページ側では通常のエラーとして扱えばよい。

### 13.2 sheets-api.ts のエラー形式

```typescript
throw new Error(`Sheets API error: ${res.status} ${JSON.stringify(err)}`);
```

### 13.3 ページでのエラー表示例

```tsx
const [error, setError] = useState<string | null>(null);

// ...
try {
  await withAuthRetry(...);
} catch (e) {
  setError(e instanceof Error ? e.message : '不明なエラー');
}

// JSX
{error && (
  <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
)}
```

### 13.4 `isInitializing` 中のガード

`App.tsx` の `ProtectedRoute` が `isInitializing === true` の間はスピナーを表示するため、ページコンポーネントはセッション復元完了後にのみレンダリングされる。

---

## 14. コーディング規約

### 14.1 命名規則

| 対象 | 規則 | 例 |
|------|-----|-----|
| コンポーネント | PascalCase | `PlanterCard` |
| ファイル | PascalCase (コンポーネント) / kebab-case (サービス・ユーティリティ) | `PlanterCard.tsx`, `sheets-api.ts` |
| 型・インターフェース | PascalCase | `ActivityLog`, `AuthUser` |
| 変数・関数 | camelCase | `getPlanters`, `cropName` |
| 定数 | UPPER_SNAKE_CASE | `SHEET_NAMES`, `IMAGE_SETTINGS` |
| CSS クラス | Tailwind ユーティリティ + カスタムは kebab-case | `garden-700` |

### 14.2 インポート順序

1. React / React関連
2. 外部ライブラリ（react-router-dom, zustand, recharts 等）
3. 内部 `@/` エイリアスパス（types, stores, services, utils, constants, components 順）

### 14.3 型安全

- `any` の使用は禁止。`unknown` + 型ガードを使う。
- Non-null assertion `!` は極力避ける。`??` や early return を使う。
- シートから取得した生文字列は明示的に型変換（`Number()`, `as ActivityType` 等）。

### 14.4 React パターン

- 関数コンポーネント + Hooks のみ使用（クラスコンポーネント不使用）。
- カスタムフックは `use` プレフィックス。
- 副作用は `useEffect` に閉じ込め、依存配列を適切に設定。
- `key` は配列レンダリングで必ず設定（インデックス使用不可、`id` を使う）。

---

## 15. ビルド・デプロイ

### 15.1 ローカル開発

```bash
npm install
npm run dev       # http://localhost:5173/HomeGardenDiary/
npm run build     # dist/ に静的ファイルを生成
npm run preview   # dist/ をローカルでプレビュー
npm run lint      # ESLint チェック
```

### 15.2 GitHub Pages デプロイ

`.github/workflows/deploy.yml` により `main` ブランチへの push で自動デプロイ:

```
push → main
  └── GitHub Actions
        ├── actions/checkout
        ├── actions/setup-node (Node.js 20)
        ├── npm ci
        ├── npm run build
        └── actions/deploy-pages (dist/ を公開)
```

**公開URL:** `https://{username}.github.io/HomeGardenDiary/`

### 15.3 SPA フォールバック

GitHub Pages は SPA のディープリンクに対応しないため、`public/404.html` を配置:

- 404リクエストを `index.html` の内容で返し、React Router が処理する。
- `index.html` と `404.html` の内容を同一にするか、リダイレクト用スクリプトを埋め込む。

### 15.4 ビルド成果物

```
dist/
├── index.html
├── 404.html
├── assets/
│   ├── index-[hash].js   # バンドル済みJS
│   └── index-[hash].css  # バンドル済みCSS
└── (public/ 配下のファイル)
```

---

## 16. 未実装機能の追加手順

### 16.1 新しいページを追加する場合

1. `src/pages/NewPage.tsx` を作成
2. `src/App.tsx` の `<Routes>` に `<Route>` を追加
3. `src/components/layout/Sidebar.tsx` および `BottomNav.tsx` にナビゲーションリンクを追加
4. 必要に応じて `src/types/index.ts` に型を追加

### 16.2 新しい Sheets 操作を追加する場合

1. `src/services/sheets-api.ts` に関数を追加
2. 行↔型変換関数を追加（または `sheets-api.ts` に配置）
3. `withAuthRetry` でラップして呼び出す

### 16.3 新しいグラフを追加する場合

現在はチャートロジックを各ページコンポーネント（`Weather.tsx`, `SoilSensor.tsx`）内に直接実装している。

1. 小規模なチャートはページ内に直接実装する
2. 複数ページで再利用する場合は `src/components/charts/` ディレクトリを作成して切り出す
3. Recharts の `ResponsiveContainer` でラップしてレスポンシブに対応
4. データは親コンポーネントが取得し、props で渡す

### 16.4 カスタムフックを追加する場合

1. `src/hooks/` ディレクトリを作成（現在は存在しない）
2. `useXxx.ts` として配置
3. データ取得・変換ロジックをカプセル化し、ページをシンプルに保つ

> **推奨:** Phase 2 以降でデータ取得ロジックが増えてきたら `src/hooks/` を作成し、各ページの `useEffect` を `usePlanters`, `useActivities`, `useWeather` 等のカスタムフックへ切り出す。

### 16.5 GAS 連携を追加する場合

`gas/` ディレクトリは SPA とは独立したスクリプト。Apps Script エディタにコピー＆ペーストして使用。SPA から直接呼び出さない（GAS は Sheets/Drive に書き込む役割のみ）。

---

## 付録A: スプレッドシート初期化

`sheets-api.ts` の `initializeSpreadsheet()` 関数を Settings ページから呼び出すことで、6シートのヘッダー行を自動設定できる。

**初期化チェックリスト:**

- [ ] Google Cloud Console でプロジェクト作成・API有効化
- [ ] OAuth クライアントID 発行（GitHub Pages URLを承認済みオリジンに追加）
- [ ] スプレッドシート作成・ID確認
- [ ] Google Drive の `HomeGardenDiary` フォルダ作成・ID確認
- [ ] Settings ページで Client ID / Spreadsheet ID / Drive Folder ID を入力
- [ ] 「シートを初期化」ボタンで全シートのヘッダー行を作成

## 付録B: 環境変数・シークレット管理

本アプリは**環境変数を使用しない**。全ての設定値（Client ID, Spreadsheet ID 等）はブラウザの `localStorage` に保存され、Settings ページから入力する。

- `.env` ファイルは不要（GitHub Pages は静的サイトのためサーバーサイドのシークレット管理が不要）。
- Google OAuth のトークンは `localStorage` + Zustand `persist` で管理。

## 付録C: Tailwind カスタムカラー

`tailwind.config.js` で `garden` カラーパレットを定義:

```javascript
theme: {
  extend: {
    colors: {
      garden: {
        50:  '#f0fdf4',
        100: '#dcfce7',
        // ...
        700: '#15803d',
        900: '#14532d',
      }
    }
  }
}
```

`garden-*` クラスをUI全体の基調色として使用する。

---

*以上*
