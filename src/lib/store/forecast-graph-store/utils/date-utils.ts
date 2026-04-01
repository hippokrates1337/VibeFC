import type { UnifiedCalculationResult } from '@/types/forecast';

/**
 * Convert a date-only string (YYYY-MM-DD) to a Date at local midnight
 * without the implicit UTC shift that `new Date(string)` applies.
 */
export const toLocalDate = (dateStr: string): Date => {
  // FIXED: Create UTC dates to match backend format and avoid timezone shifts
  return new Date(`${dateStr}T00:00:00.000Z`);
};

/**
 * Convert YYYY-MM-DD to MM-YYYY format
 */
export const formatToMmYyyy = (dateStr: string): string => {
  const [year, month] = dateStr.split('-');
  return `${month}-${year}`;
};

/**
 * MM-YYYY for a Date using UTC calendar fields.
 * Must match `generateForecastMonths` (UTC month boundaries) and API `month` strings.
 */
export const dateToMmYyyyUtc = (date: Date): string => {
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
};

/**
 * Calendar MM-YYYY using **local** year/month (same month the user sees on the slider).
 * Use for matching API `month` keys when `selectedVisualizationMonth` may be local midnight
 * (UTC month from `dateToMmYyyyUtc` would be wrong for e.g. Europe/Berlin Feb 1).
 */
export const dateToMmYyyyLocalCalendar = (date: Date): string => {
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

/**
 * Normalize API/store MM-YYYY strings so "1-2025" matches "01-2025".
 */
export const normalizeMmYyyyKey = (month: string): string => {
  const parts = month.trim().split('-');
  if (parts.length !== 2) {
    return month.trim();
  }
  const [mo, yr] = parts;
  return `${mo.padStart(2, '0')}-${yr}`;
};

/**
 * Normalize API month fields: MM-YYYY, or ISO timestamps from JSON/DB.
 */
export const coerceMonthToMmYyyyKey = (raw: unknown): string | null => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const mmyyyy = /^(\d{1,2})-(\d{4})$/;
  const direct = s.match(mmyyyy);
  if (direct) {
    return `${direct[1].padStart(2, '0')}-${direct[2]}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
  }
  return null;
};

/**
 * Parse MM-YYYY to UTC first-of-month Date (matches `generateForecastMonths` / API month keys).
 */
const mmYyyyToUtcMonthStartDate = (key: string): Date | null => {
  const n = normalizeMmYyyyKey(key);
  const m = /^(\d{2})-(\d{4})$/.exec(n);
  if (!m) return null;
  const mo = parseInt(m[1], 10) - 1;
  const yr = parseInt(m[2], 10);
  return new Date(Date.UTC(yr, mo, 1, 0, 0, 0, 0));
};

/**
 * Chronological order for API/store month keys (MM-YYYY). Do not use `localeCompare` on MM-YYYY.
 */
export const compareMmYyyyAsc = (a: string, b: string): number => {
  const da = mmYyyyToUtcMonthStartDate(a);
  const db = mmYyyyToUtcMonthStartDate(b);
  if (!da || !db) return 0;
  return da.getTime() - db.getTime();
};

/**
 * Inclusive UTC month starts from MM-YYYY … MM-YYYY (matches API `periodInfo` when ISO dates are not yet in store).
 */
export const generateMonthsInMmYyyyRange = (startMmYyyy: string, endMmYyyy: string): Date[] => {
  const start = mmYyyyToUtcMonthStartDate(normalizeMmYyyyKey(startMmYyyy));
  const end = mmYyyyToUtcMonthStartDate(normalizeMmYyyyKey(endMmYyyy));
  if (!start || !end || start.getTime() > end.getTime()) {
    return [];
  }
  const months: Date[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    months.push(new Date(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return months;
};

/**
 * Month timeline present in unified calculation results (same keys as `getNodeValueForMonth` lookup).
 * When the graph's forecast dates (YYYY-MM-DD) span a wider calendar range than the engine series,
 * the slider must use this list so badges resolve month rows.
 */
export const monthsFromUnifiedCalculationResults = (
  result: UnifiedCalculationResult | null | undefined
): Date[] | null => {
  if (!result) return null;
  const node =
    result.allNodes?.find((n) => n.values?.length) ??
    result.metrics?.find((n) => n.values?.length);
  if (!node?.values?.length) return null;
  const keys = [
    ...new Set(
      node.values
        .map((v) => coerceMonthToMmYyyyKey(v.month))
        .filter((k): k is string => Boolean(k))
    ),
  ];
  if (keys.length === 0) return null;
  keys.sort(compareMmYyyyAsc);
  const dates = keys
    .map((k) => mmYyyyToUtcMonthStartDate(k))
    .filter((d): d is Date => d != null);
  return dates.length ? dates : null;
};

/**
 * Generate array of Date objects for forecast period
 */
export const generateForecastMonths = (startDate: string, endDate: string): Date[] => {
  const months: Date[] = [];
  const start = toLocalDate(startDate);
  const end = toLocalDate(endDate);
  
  // FIXED: Normalize to first of month using UTC methods to avoid timezone conversion
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(1);
  end.setUTCHours(0, 0, 0, 0);
  
  const current = new Date(start);
  while (current <= end) {
    months.push(new Date(current));
    // FIXED: Use UTC methods for month iteration to maintain UTC dates
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  
  return months;
};
