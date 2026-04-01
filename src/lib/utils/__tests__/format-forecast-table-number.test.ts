import { describe, expect, test } from '@jest/globals';
import { formatForecastTableNumber } from '../format-forecast-table-number';

describe('formatForecastTableNumber', () => {
  test('null and NaN', () => {
    expect(formatForecastTableNumber(null)).toBe('-');
    expect(formatForecastTableNumber(undefined)).toBe('-');
    expect(formatForecastTableNumber(Number.NaN)).toBe('-');
  });

  test('zero', () => {
    expect(formatForecastTableNumber(0)).toBe('0');
  });

  test('conversion-style fractions as percent (de-DE)', () => {
    expect(formatForecastTableNumber(0.2)).toBe('20\u00a0%');
    expect(formatForecastTableNumber(0.02)).toBe('2\u00a0%');
  });

  test('100 percent', () => {
    expect(formatForecastTableNumber(1)).toBe('100\u00a0%');
  });

  test('millions use compact notation', () => {
    expect(formatForecastTableNumber(12_000_000)).toMatch(/Mio/);
  });

  test('thousands to below millions use grouped decimal (aligned with operator cells)', () => {
    expect(formatForecastTableNumber(150_000)).toBe('150.000');
    expect(formatForecastTableNumber(360_926.4)).toBe('360.926,4');
  });

  test('values between 1 and 1000 use grouped decimal', () => {
    expect(formatForecastTableNumber(42.7)).toBe('42,7');
  });

  test('values above 1 and below 1000 are not percent', () => {
    expect(formatForecastTableNumber(1.5)).not.toContain('%');
  });
});
