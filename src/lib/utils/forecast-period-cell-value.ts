import type { MergedTimeSeriesValue } from '@/types/forecast';

export type PeriodValueSegment = 'historical' | 'forecast' | 'budget';

/**
 * Raw numeric value for a period cell (same selection as the UI table, without display formatting).
 */
export function rawNumericForPeriodCell(
  monthData: MergedTimeSeriesValue | undefined,
  segment: PeriodValueSegment,
  nodeType: string
): number | null {
  if (!monthData) return null;
  if (segment === 'historical') {
    if (monthData.historical === null || monthData.historical === undefined) return null;
    return monthData.historical;
  }
  if (segment === 'forecast') {
    if (monthData.forecast === null || monthData.forecast === undefined) return null;
    return monthData.forecast;
  }
  if (nodeType === 'METRIC') {
    if (monthData.budget === null || monthData.budget === undefined) return null;
    return monthData.budget;
  }
  return null;
}
