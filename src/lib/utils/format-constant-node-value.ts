/**
 * Plain decimal display for constant nodes (de-DE).
 * Does not apply forecast-table rules (e.g. percent for fractions in (0,1]).
 */

const LOCALE = 'de-DE';

/**
 * Formats a finite number with German grouping and decimal comma.
 */
export function formatConstantNodeValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 20,
    minimumFractionDigits: 0
  }).format(value);
}

/**
 * Parses user input for de-DE: `.` thousands, `,` decimal.
 * Returns null for empty or invalid input (allows intermediate typing states).
 */
export function parseConstantNodeValueInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  let sign = 1;
  let s = trimmed;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1).trim();
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim();
  }
  if (s === '') {
    return null;
  }

  const noThousands = s.replace(/\./g, '');
  const normalized = noThousands.replace(',', '.');
  if (normalized === '' || normalized === '.' || normalized === '-' || normalized === '+') {
    return null;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return null;
  }
  return sign * n;
}
