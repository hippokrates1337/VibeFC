import { rawNumericForPeriodCell } from '@/lib/utils/forecast-period-cell-value';
import type { MergedTimeSeriesValue } from '@/types/forecast';

function mockValue(partial: Partial<MergedTimeSeriesValue>): MergedTimeSeriesValue {
  return {
    month: '01-2025',
    forecast: null,
    budget: null,
    historical: null,
    calculated: null,
    isPeriodActual: true,
    formattedForecast: '',
    formattedBudget: '',
    formattedHistorical: '',
    formattedCalculated: '',
    ...partial
  } as MergedTimeSeriesValue;
}

describe('rawNumericForPeriodCell', () => {
  test('returns null when monthData is undefined', () => {
    expect(rawNumericForPeriodCell(undefined, 'historical', 'METRIC')).toBeNull();
  });

  test('historical segment returns historical value', () => {
    const v = mockValue({ historical: 42 });
    expect(rawNumericForPeriodCell(v, 'historical', 'METRIC')).toBe(42);
  });

  test('forecast segment returns forecast value', () => {
    const v = mockValue({ forecast: 3.14 });
    expect(rawNumericForPeriodCell(v, 'forecast', 'DATA')).toBe(3.14);
  });

  test('budget segment returns budget for METRIC only', () => {
    const v = mockValue({ budget: 100 });
    expect(rawNumericForPeriodCell(v, 'budget', 'METRIC')).toBe(100);
    expect(rawNumericForPeriodCell(v, 'budget', 'DATA')).toBeNull();
  });
});
