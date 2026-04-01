import { describe, expect, test } from '@jest/globals';
import {
  coerceMonthToMmYyyyKey,
  compareMmYyyyAsc,
  dateToMmYyyyUtc,
  generateForecastMonths,
  monthsFromUnifiedCalculationResults,
  normalizeMmYyyyKey,
} from '../date-utils';
import type { UnifiedCalculationResult } from '@/types/forecast';

describe('dateToMmYyyyUtc', () => {
  test('uses UTC calendar month (matches API MM-YYYY keys)', () => {
    expect(dateToMmYyyyUtc(new Date('2025-01-01T00:00:00.000Z'))).toBe('01-2025');
    expect(dateToMmYyyyUtc(new Date('2025-12-01T00:00:00.000Z'))).toBe('12-2025');
  });

  test('aligns with generateForecastMonths first month', () => {
    const months = generateForecastMonths('2025-01-15', '2025-03-20');
    expect(months.length).toBeGreaterThan(0);
    expect(dateToMmYyyyUtc(months[0])).toBe('01-2025');
  });
});

describe('normalizeMmYyyyKey', () => {
  test('pads single-digit month', () => {
    expect(normalizeMmYyyyKey('1-2025')).toBe('01-2025');
    expect(normalizeMmYyyyKey('01-2025')).toBe('01-2025');
  });
});

describe('compareMmYyyyAsc', () => {
  test('sorts chronologically, not lexicographically', () => {
    const unsorted = ['06-2025', '07-2024', '01-2025', '12-2024', '08-2025'];
    const sorted = [...unsorted].sort(compareMmYyyyAsc);
    expect(sorted).toEqual(['07-2024', '12-2024', '01-2025', '06-2025', '08-2025']);
  });
});

describe('coerceMonthToMmYyyyKey', () => {
  test('parses ISO strings to MM-YYYY (UTC)', () => {
    expect(coerceMonthToMmYyyyKey('2025-01-01T00:00:00.000Z')).toBe('01-2025');
  });
});

describe('monthsFromUnifiedCalculationResults', () => {
  test('derives timeline from first node with values (not graph date range)', () => {
    const result: UnifiedCalculationResult = {
      id: 'r1',
      forecastId: 'f1',
      calculatedAt: new Date(),
      calculationTypes: ['forecast'],
      periodInfo: {
        forecastStartMonth: '03-2026',
        forecastEndMonth: '02-2027',
        actualStartMonth: '10-2025',
        actualEndMonth: '02-2026',
      },
      metrics: [
        {
          nodeId: 'm1',
          nodeType: 'METRIC',
          values: [
            { month: '10-2025', forecast: null, budget: null, historical: null },
            { month: '11-2025', forecast: null, budget: null, historical: null },
          ],
        },
      ],
      allNodes: [],
    };
    const months = monthsFromUnifiedCalculationResults(result);
    expect(months).not.toBeNull();
    expect(months!.length).toBe(2);
    expect(dateToMmYyyyUtc(months![0])).toBe('10-2025');
    expect(dateToMmYyyyUtc(months![1])).toBe('11-2025');
  });
});
