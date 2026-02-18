import { SHEET_NAMES } from '@/constants';

/**
 * Google Sheets API wrapper
 * All read/write operations to the spreadsheet go through this service
 */

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// ===== Generic helpers =====

async function fetchSheets(
  url: string,
  accessToken: string,
  options?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Sheets API error: ${res.status} ${JSON.stringify(err)}`);
  }
  return res;
}

/**
 * Read all rows from a sheet
 */
export async function getSheetData(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
): Promise<string[][]> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const res = await fetchSheets(url, accessToken);
  const data = await res.json();
  return data.values ?? [];
}

/**
 * Append rows to a sheet
 */
export async function appendRows(
  spreadsheetId: string,
  sheetName: string,
  rows: (string | number | null)[][],
  accessToken: string,
): Promise<void> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await fetchSheets(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({ values: rows }),
  });
}

/**
 * Update a specific row by finding the row number
 */
export async function updateRow(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number, // 1-based (1 = header, 2 = first data row)
  row: (string | number | null)[],
  accessToken: string,
): Promise<void> {
  const range = `${sheetName}!A${rowIndex}:${columnLetter(row.length)}${rowIndex}`;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  await fetchSheets(url, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ values: [row] }),
  });
}

/**
 * Delete a row by clearing it (Sheets API doesn't support direct row delete via REST easily)
 * We clear the row and it will appear empty
 */
export async function clearRow(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  accessToken: string,
): Promise<void> {
  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  await fetchSheets(url, accessToken, { method: 'POST' });
}

// ===== Planter operations =====

export async function getPlanters(spreadsheetId: string, accessToken: string) {
  const rows = await getSheetData(spreadsheetId, SHEET_NAMES.PLANTERS, accessToken);
  if (rows.length <= 1) return []; // only header or empty
  return rows.slice(1).filter((row) => row[0]); // skip header, skip empty rows
}

export async function addPlanter(
  spreadsheetId: string,
  row: (string | number | null)[],
  accessToken: string,
) {
  await appendRows(spreadsheetId, SHEET_NAMES.PLANTERS, [row], accessToken);
}

export async function findRowIndex(
  spreadsheetId: string,
  sheetName: string,
  id: string,
  accessToken: string,
): Promise<number> {
  const rows = await getSheetData(spreadsheetId, sheetName, accessToken);
  const idx = rows.findIndex((row) => row[0] === id);
  if (idx === -1) throw new Error(`Row not found: ${id}`);
  return idx + 1; // 1-based
}

// ===== Activity operations =====

export async function getActivities(spreadsheetId: string, accessToken: string) {
  const rows = await getSheetData(spreadsheetId, SHEET_NAMES.ACTIVITY_LOGS, accessToken);
  if (rows.length <= 1) return [];
  return rows.slice(1).filter((row) => row[0]);
}

export async function addActivity(
  spreadsheetId: string,
  row: (string | number | null)[],
  accessToken: string,
) {
  await appendRows(spreadsheetId, SHEET_NAMES.ACTIVITY_LOGS, [row], accessToken);
}

// ===== Settings operations =====

export async function getSettings(spreadsheetId: string, accessToken: string) {
  const rows = await getSheetData(spreadsheetId, SHEET_NAMES.SETTINGS, accessToken);
  const settings: Record<string, string> = {};
  rows.slice(1).forEach((row) => {
    if (row[0]) settings[row[0]] = row[1] ?? '';
  });
  return settings;
}

// ===== Helper =====

function columnLetter(colNumber: number): string {
  let letter = '';
  let n = colNumber;
  while (n > 0) {
    n--;
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26);
  }
  return letter;
}

// ===== Initialize spreadsheet with headers =====

/**
 * Get existing sheet names in the spreadsheet
 */
async function getExistingSheetNames(
  spreadsheetId: string,
  accessToken: string,
): Promise<string[]> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetchSheets(url, accessToken);
  const data = await res.json();
  return (data.sheets ?? []).map(
    (s: { properties: { title: string } }) => s.properties.title,
  );
}

/**
 * Create missing sheets via batchUpdate
 */
async function createSheets(
  spreadsheetId: string,
  sheetNames: string[],
  accessToken: string,
): Promise<void> {
  if (sheetNames.length === 0) return;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`;
  const requests = sheetNames.map((title) => ({
    addSheet: { properties: { title } },
  }));
  await fetchSheets(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
}

export async function initializeSpreadsheet(
  spreadsheetId: string,
  accessToken: string,
): Promise<void> {
  const headers: Record<string, string[]> = {
    [SHEET_NAMES.PLANTERS]: [
      'id', 'name', 'crop_name', 'crop_variety', 'location',
      'start_date', 'end_date', 'status', 'image_folder_id', 'memo',
      'created_at', 'updated_at',
    ],
    [SHEET_NAMES.ACTIVITY_LOGS]: [
      'id', 'planter_id', 'user_name', 'activity_type', 'activity_date',
      'memo', 'quantity', 'unit', 'photo_file_ids', 'created_at',
    ],
    [SHEET_NAMES.WEATHER_DATA]: [
      'date', 'temp_max', 'temp_min', 'temp_avg', 'precipitation',
      'solar_radiation', 'humidity_avg', 'wind_speed_max', 'source', 'fetched_at',
    ],
    [SHEET_NAMES.SOIL_SENSOR_DATA]: [
      'id', 'planter_id', 'measured_at', 'vwc', 'soil_temp',
      'ec_bulk', 'ec_pore', 'created_at',
    ],
    [SHEET_NAMES.SETTINGS]: ['key', 'value'],
    [SHEET_NAMES.HARVEST_SUMMARY]: [
      'year', 'month', 'planter_id', 'crop_name',
      'total_quantity', 'unit', 'count',
    ],
  };

  // 1. Get existing sheet names
  const existingSheets = await getExistingSheetNames(spreadsheetId, accessToken);

  // 2. Create any missing sheets
  const requiredSheets = Object.keys(headers);
  const missingSheets = requiredSheets.filter(
    (name) => !existingSheets.includes(name),
  );
  if (missingSheets.length > 0) {
    await createSheets(spreadsheetId, missingSheets, accessToken);
  }

  // 3. Add header rows to empty sheets
  for (const [sheetName, headerRow] of Object.entries(headers)) {
    const data = await getSheetData(spreadsheetId, sheetName, accessToken);
    if (data.length === 0) {
      await appendRows(spreadsheetId, sheetName, [headerRow], accessToken);
    }
  }
}
