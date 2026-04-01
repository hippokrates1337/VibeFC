import type { Variable } from './types';

/**
 * Service for retrieving variable data during calculations
 */
interface IVariableDataService {
  /**
   * Get variable value for specific month
   * @param variableId UUID of the variable
   * @param targetDate Target date (will be normalized to first of month)
   * @param variables Array of available variables
   * @returns Variable value or null if not found
   */
  getVariableValueForMonth(
    variableId: string,
    targetDate: Date,
    variables: readonly Variable[]
  ): number | null;

  /**
   * Get variable value with month offset
   * @param variableId UUID of the variable
   * @param targetDate Base date for offset calculation
   * @param offsetMonths Number of months to offset (can be negative)
   * @param variables Array of available variables
   * @returns Variable value or null if not found
   */
  getVariableValueWithOffset(
    variableId: string,
    targetDate: Date,
    offsetMonths: number,
    variables: readonly Variable[]
  ): number | null;

  /**
   * Get variable value for a specific variable, date, and context
   * Used by node strategies for data retrieval
   */
  getVariableValue(
    variableId: string,
    targetDate: Date,
    variables: readonly Variable[],
    offsetMonths?: number
  ): Promise<number | null>;
}

/**
 * Implementation of variable data service for backend
 */
export class VariableDataService implements IVariableDataService {
  /**
   * Get variable value for specific month
   */
  getVariableValueForMonth(
    variableId: string,
    targetDate: Date,
    variables: readonly Variable[]
  ): number | null {
    try {
      const normalizedDate = this.normalizeToFirstOfMonth(targetDate);

      const variable = variables.find(v => v.id === variableId);

      if (!variable) {
        return null;
      }

      // Compare via year & month in UTC to avoid millisecond-level mismatches
      const targetYear = normalizedDate.getUTCFullYear();
      const targetMonth = normalizedDate.getUTCMonth();

      const timeSeriesEntry = variable.timeSeries.find(ts => {
        const tsDate = this.normalizeToFirstOfMonth(ts.date);
        return tsDate.getUTCFullYear() === targetYear && tsDate.getUTCMonth() === targetMonth;
      });

      return timeSeriesEntry?.value ?? null;
    } catch (error) {
      throw new Error(`Failed to get variable value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get variable value with month offset
   */
  getVariableValueWithOffset(
    variableId: string,
    targetDate: Date,
    offsetMonths: number,
    variables: readonly Variable[]
  ): number | null {
    try {
      const offsetDate = this.addMonths(targetDate, offsetMonths);
      return this.getVariableValueForMonth(variableId, offsetDate, variables);
    } catch (error) {
      throw new Error(`Failed to get variable value with offset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalise date to the first of the month **in UTC** so that different
   * time-zones (frontend vs backend runtime, DB stored ISO dates) still match.
   *
   * Using the local constructor caused an off-by-one-hour shift (CET ↔︎ UTC)
   * which broke strict millisecond comparisons and resulted in `null` values
   * for perfectly matching calendar days. By switching to `Date.UTC` we keep
   * the instant identical to ISO strings like "2024-01-01T00:00:00Z" that are
   * produced when parsing plain date strings with `new Date('YYYY-MM-DD')`.
   */
  private normalizeToFirstOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  /**
   * Get variable value for a specific variable, date, and context
   * Used by node strategies for data retrieval
   */
  async getVariableValue(
    variableId: string,
    targetDate: Date,
    variables: readonly Variable[],
    offsetMonths?: number
  ): Promise<number | null> {
    if (offsetMonths !== undefined && offsetMonths !== 0) {
      return this.getVariableValueWithOffset(variableId, targetDate, offsetMonths, variables);
    } else {
      return this.getVariableValueForMonth(variableId, targetDate, variables);
    }
  }

  private addMonths(date: Date, months: number): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const newMonthIndex = month + months;
    const newYear = year + Math.floor(newMonthIndex / 12);
    const modMonth = ((newMonthIndex % 12) + 12) % 12;

    return new Date(Date.UTC(newYear, modMonth, day));
  }
} 