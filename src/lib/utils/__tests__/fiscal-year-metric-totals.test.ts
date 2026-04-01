import {
  calendarYearsFromMonths,
  fyForecastAndBudget,
  primaryValueForMonth
} from '@/lib/utils/fiscal-year-metric-totals';
import type { MergedTimeSeriesValue } from '@/types/forecast';

function row(partial: Partial<MergedTimeSeriesValue> & { month: string }): MergedTimeSeriesValue {
  return {
    month: partial.month,
    forecast: null,
    budget: null,
    historical: null,
    calculated: null,
    isPeriodActual: false,
    formattedForecast: '',
    formattedBudget: '',
    formattedHistorical: '',
    formattedCalculated: '',
    ...partial
  } as MergedTimeSeriesValue;
}

describe('primaryValueForMonth', () => {
  test('uses historical when actual period', () => {
    expect(primaryValueForMonth(row({ month: '01-2025', isPeriodActual: true, historical: 10, forecast: 99 }))).toBe(10);
  });

  test('uses forecast when not actual period', () => {
    expect(primaryValueForMonth(row({ month: '06-2025', isPeriodActual: false, historical: 1, forecast: 20 }))).toBe(20);
  });

  test('falls back to historical when not actual period and forecast is null', () => {
    expect(
      primaryValueForMonth(
        row({ month: '06-2025', isPeriodActual: false, historical: 7, forecast: null })
      )
    ).toBe(7);
  });
});

describe('fyForecastAndBudget', () => {
  test('flow METRIC sums months in year and budgets', () => {
    const values = [
      row({ month: '01-2025', isPeriodActual: true, historical: 1, forecast: null, budget: 2 }),
      row({ month: '02-2025', isPeriodActual: true, historical: 3, forecast: null, budget: 4 })
    ];
    const r = fyForecastAndBudget(values, 2025, 'METRIC', 'flow');
    expect(r.forecast).toBe(4);
    expect(r.budget).toBe(6);
  });

  test('stock METRIC uses December only', () => {
    const values = [
      row({ month: '11-2025', isPeriodActual: false, historical: null, forecast: 1, budget: 9 }),
      row({
        month: '12-2025',
        isPeriodActual: false,
        historical: null,
        forecast: 100,
        budget: 50
      })
    ];
    const r = fyForecastAndBudget(values, 2025, 'METRIC', 'stock');
    expect(r.forecast).toBe(100);
    expect(r.budget).toBe(50);
  });

  test('stock METRIC returns null when December missing', () => {
    const values = [row({ month: '11-2025', isPeriodActual: false, forecast: 1, budget: 1 })];
    const r = fyForecastAndBudget(values, 2025, 'METRIC', 'stock');
    expect(r.forecast).toBeNull();
    expect(r.budget).toBeNull();
  });

  test('non-METRIC flow sums primary; budget null', () => {
    const values = [
      row({ month: '03-2024', isPeriodActual: true, historical: 5, forecast: null, budget: null })
    ];
    const r = fyForecastAndBudget(values, 2024, 'OPERATOR', 'flow');
    expect(r.forecast).toBe(5);
    expect(r.budget).toBeNull();
  });

  test('defaults METRIC to flow when kind undefined', () => {
    const values = [
      row({ month: '01-2025', isPeriodActual: true, historical: 2, budget: 1 }),
      row({ month: '02-2025', isPeriodActual: true, historical: 3, budget: 1 })
    ];
    const r = fyForecastAndBudget(values, 2025, 'METRIC', undefined);
    expect(r.forecast).toBe(5);
    expect(r.budget).toBe(2);
  });
});

describe('calendarYearsFromMonths', () => {
  test('returns sorted unique years', () => {
    expect(calendarYearsFromMonths(['12-2024', '01-2025', '06-2024'])).toEqual([2024, 2025]);
  });
});
