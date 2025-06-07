import type { Variable } from '@/lib/store/variables';

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
}

/**
 * Implementation of variable data service
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

      const timeSeriesEntry = variable.timeSeries.find(ts => 
        this.normalizeToFirstOfMonth(ts.date).getTime() === normalizedDate.getTime()
      );

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

  private normalizeToFirstOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
} 