import {
  formatMonth,
  isValidMonthString,
  monthIndex,
  monthIndexFromDate,
  monthIndexFromDateString,
  monthRange,
  parseMonth,
} from '../months';

describe('month indices', () => {
  it('are year * 12 + zero-based month', () => {
    expect(monthIndex(2025, 1)).toBe(2025 * 12);
    expect(monthIndex(2024, 12)).toBe(2025 * 12 - 1);
    expect(parseMonth('01-2025')).toBe(monthIndex(2025, 1));
  });

  it('round-trip through MM-YYYY', () => {
    for (const s of ['01-2025', '12-2024', '06-1999', '10-2030']) {
      expect(formatMonth(parseMonth(s))).toBe(s);
    }
    expect(formatMonth(parseMonth('01-2025') - 1)).toBe('12-2024');
    expect(formatMonth(parseMonth('12-2024') + 1)).toBe('01-2025');
  });

  it('reject malformed MM-YYYY', () => {
    expect(isValidMonthString('13-2025')).toBe(false);
    expect(isValidMonthString('1-2025')).toBe(false);
    expect(() => parseMonth('2025-01')).toThrow(/MM-YYYY/);
  });

  it('read the calendar month of a date string as written', () => {
    expect(formatMonth(monthIndexFromDateString('2024-03-01'))).toBe('03-2024');
    expect(formatMonth(monthIndexFromDateString('2024-03-01T00:00:00.000Z'))).toBe('03-2024');
    expect(formatMonth(monthIndexFromDateString('2024-03-31T23:30:00-05:00'))).toBe('03-2024');
  });

  it('read Date objects in UTC', () => {
    expect(formatMonth(monthIndexFromDate(new Date(Date.UTC(2025, 0, 1))))).toBe('01-2025');
    expect(formatMonth(monthIndexFromDate(new Date('2024-12-31T23:00:00.000Z')))).toBe('12-2024');
  });

  it('build inclusive ranges', () => {
    expect(monthRange(parseMonth('11-2024'), parseMonth('02-2025')).map(formatMonth)).toEqual([
      '11-2024',
      '12-2024',
      '01-2025',
      '02-2025',
    ]);
    expect(monthRange(parseMonth('02-2025'), parseMonth('01-2025'))).toEqual([]);
  });
});
