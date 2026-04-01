import type { MMYYYYUtils } from './types';

/**
 * Utility functions for MM-YYYY date string manipulation
 * Used by the unified calculation engine to handle month-based calculations
 */
export class MMYYYYUtilsService implements MMYYYYUtils {
  private readonly MM_YYYY_PATTERN = /^(0[1-9]|1[0-2])-\d{4}$/;

  /**
   * Validates MM-YYYY format
   */
  isValidMMYYYY(month: string): boolean {
    return this.MM_YYYY_PATTERN.test(month);
  }

  /**
   * Adds months to MM-YYYY string
   * Example: addMonths('01-2024', 3) => '04-2024'
   */
  addMonths(month: string, monthsToAdd: number): string {
    if (!this.isValidMMYYYY(month)) {
      throw new Error(`Invalid MM-YYYY format: ${month}`);
    }

    const [monthStr, yearStr] = month.split('-');
    const currentMonth = parseInt(monthStr, 10);
    const currentYear = parseInt(yearStr, 10);

    const totalMonths = (currentYear * 12) + currentMonth + monthsToAdd;
    const newYear = Math.floor((totalMonths - 1) / 12);
    const newMonth = ((totalMonths - 1) % 12) + 1;

    return `${newMonth.toString().padStart(2, '0')}-${newYear}`;
  }

  /**
   * Subtracts months from MM-YYYY string
   * Example: subtractMonths('04-2024', 3) => '01-2024'
   */
  subtractMonths(month: string, monthsToSubtract: number): string {
    return this.addMonths(month, -monthsToSubtract);
  }

  /**
   * Compares two MM-YYYY strings
   * Returns: -1 if month1 < month2, 0 if equal, 1 if month1 > month2
   */
  compareMonths(month1: string, month2: string): number {
    if (!this.isValidMMYYYY(month1) || !this.isValidMMYYYY(month2)) {
      throw new Error(`Invalid MM-YYYY format: ${month1} or ${month2}`);
    }

    const [month1Str, year1Str] = month1.split('-');
    const [month2Str, year2Str] = month2.split('-');
    
    const date1Value = parseInt(year1Str, 10) * 12 + parseInt(month1Str, 10);
    const date2Value = parseInt(year2Str, 10) * 12 + parseInt(month2Str, 10);

    if (date1Value < date2Value) return -1;
    if (date1Value > date2Value) return 1;
    return 0;
  }

  /**
   * Gets array of MM-YYYY strings between start and end (inclusive)
   * Example: getMonthsBetween('01-2024', '03-2024') => ['01-2024', '02-2024', '03-2024']
   */
  getMonthsBetween(startMonth: string, endMonth: string): string[] {
    if (!this.isValidMMYYYY(startMonth) || !this.isValidMMYYYY(endMonth)) {
      throw new Error(`Invalid MM-YYYY format: ${startMonth} or ${endMonth}`);
    }

    const months: string[] = [];
    let current = startMonth;

    while (this.compareMonths(current, endMonth) <= 0) {
      months.push(current);
      if (current === endMonth) break; // Prevent infinite loop
      current = this.addMonths(current, 1);
    }

    return months;
  }

  /**
   * Converts Date object to MM-YYYY string
   * Always uses first of month in UTC to avoid timezone issues
   */
  dateToMMYYYY(date: Date): string {
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear().toString();
    return `${month}-${year}`;
  }

  /**
   * Converts MM-YYYY string to Date object (first of month)
   * Always creates UTC date to avoid timezone issues
   */
  mmyyyyToFirstOfMonth(month: string): Date {
    if (!this.isValidMMYYYY(month)) {
      throw new Error(`Invalid MM-YYYY format: ${month}`);
    }

    const [monthStr, yearStr] = month.split('-');
    const monthNum = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    // Create UTC date to avoid timezone issues
    return new Date(Date.UTC(year, monthNum - 1, 1));
  }
} 