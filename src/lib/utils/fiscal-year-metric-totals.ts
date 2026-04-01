import type { MetricSeriesKind } from '@/lib/store/forecast-graph-store/types';
import type { MergedTimeSeriesValue } from '@/types/forecast';

/**
 * Primary month value aligned with monthly Actual vs Forecast columns:
 * historical in actual period; otherwise prefer forecast, then historical (e.g. past actuals-only
 * months outside the configured actual window still contribute to calendar-year totals).
 */
export function primaryValueForMonth(monthData: MergedTimeSeriesValue | undefined): number | null {
  if (!monthData) return null;
  if (monthData.isPeriodActual) {
    if (monthData.historical === null || monthData.historical === undefined) return null;
    return monthData.historical;
  }
  if (monthData.forecast !== null && monthData.forecast !== undefined) return monthData.forecast;
  if (monthData.historical !== null && monthData.historical !== undefined) return monthData.historical;
  return null;
}

function calendarYearFromMonth(mmYyyy: string): number | null {
  const parts = mmYyyy.split('-');
  if (parts.length !== 2) return null;
  const y = parseInt(parts[1], 10);
  return Number.isFinite(y) ? y : null;
}

function valuesInCalendarYear(values: MergedTimeSeriesValue[], year: number): MergedTimeSeriesValue[] {
  return values.filter((v) => calendarYearFromMonth(v.month) === year);
}

function decemberKey(year: number): string {
  return `12-${year}`;
}

/**
 * Calendar-year FY forecast and budget totals for the results table and Excel export.
 */
export function fyForecastAndBudget(
  mergedValues: MergedTimeSeriesValue[],
  year: number,
  nodeType: string,
  metricSeriesKind: MetricSeriesKind | undefined
): { forecast: number | null; budget: number | null } {
  const kind: MetricSeriesKind = metricSeriesKind ?? 'flow';
  const isMetric = nodeType === 'METRIC';

  if (isMetric && kind === 'stock') {
    const dec = mergedValues.find((v) => v.month === decemberKey(year));
    if (!dec) {
      return { forecast: null, budget: null };
    }
    const forecast = primaryValueForMonth(dec);
    let budget: number | null = null;
    if (dec.budget !== null && dec.budget !== undefined) {
      budget = dec.budget;
    }
    return { forecast, budget };
  }

  // Flow: METRIC or non-METRIC
  const inYear = valuesInCalendarYear(mergedValues, year);
  if (inYear.length === 0) {
    return { forecast: null, budget: null };
  }

  let forecastSum = 0;
  let forecastAny = false;
  for (const m of inYear) {
    const p = primaryValueForMonth(m);
    if (p !== null) {
      forecastSum += p;
      forecastAny = true;
    }
  }

  let budgetOut: number | null = null;
  if (isMetric) {
    let budgetSum = 0;
    let budgetAny = false;
    for (const m of inYear) {
      if (m.budget !== null && m.budget !== undefined) {
        budgetSum += m.budget;
        budgetAny = true;
      }
    }
    budgetOut = budgetAny ? budgetSum : null;
  }

  return {
    forecast: forecastAny ? forecastSum : null,
    budget: budgetOut
  };
}

/**
 * Distinct calendar years present in sorted MM-YYYY month keys, ascending.
 */
export function calendarYearsFromMonths(months: string[]): number[] {
  const years = new Set<number>();
  for (const m of months) {
    const y = calendarYearFromMonth(m);
    if (y !== null) years.add(y);
  }
  return Array.from(years).sort((a, b) => a - b);
}
