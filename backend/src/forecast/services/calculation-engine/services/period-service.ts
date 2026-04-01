/**
 * Period Service - Phase 1.2
 * Handles MM-YYYY period processing and validation
 */

import { Injectable } from '@nestjs/common';
import { PeriodConfiguration, MonthUtility, ValidationResult } from '../types/calculation-types';

@Injectable()
export class PeriodService implements MonthUtility {
  
  processPeriods(periods: {
    forecast: { start: string; end: string };
    actual: { start: string; end: string };
  }): PeriodConfiguration {
    const forecastMonths = this.getMonthsBetween(periods.forecast.start, periods.forecast.end);
    const actualMonths = this.getMonthsBetween(periods.actual.start, periods.actual.end);
    const allMonths = [...new Set([...forecastMonths, ...actualMonths])].sort((a, b) => 
      this.compareMonths(a, b)
    );
    
    return {
      forecastMonths,
      actualMonths,
      allMonths
    };
  }

  validatePeriods(periods: {
    forecast: { start: string; end: string };
    actual: { start: string; end: string };
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate MM-YYYY format
    if (!this.isValidMMYYYY(periods.forecast.start)) {
      errors.push(`Invalid forecast start period format: ${periods.forecast.start}`);
    }
    if (!this.isValidMMYYYY(periods.forecast.end)) {
      errors.push(`Invalid forecast end period format: ${periods.forecast.end}`);
    }
    if (!this.isValidMMYYYY(periods.actual.start)) {
      errors.push(`Invalid actual start period format: ${periods.actual.start}`);
    }
    if (!this.isValidMMYYYY(periods.actual.end)) {
      errors.push(`Invalid actual end period format: ${periods.actual.end}`);
    }

    // Validate period order
    if (this.compareMonths(periods.forecast.start, periods.forecast.end) >= 0) {
      errors.push('Forecast start period must be before end period');
    }
    if (this.compareMonths(periods.actual.start, periods.actual.end) >= 0) {
      errors.push('Actual start period must be before end period');
    }

    // Check for overlap
    if (this.compareMonths(periods.actual.end, periods.forecast.start) >= 0 && 
        this.compareMonths(periods.actual.start, periods.forecast.end) <= 0) {
      errors.push('Actual period cannot overlap with forecast period');
    }

    // Warn if actual period is after forecast period
    if (this.compareMonths(periods.actual.start, periods.forecast.start) >= 0) {
      warnings.push('Actual period typically comes before forecast period');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // MM-YYYY utility methods
  isValidMMYYYY(month: string): boolean {
    return /^(0[1-9]|1[0-2])-\d{4}$/.test(month);
  }

  compareMonths(month1: string, month2: string): number {
    if (!this.isValidMMYYYY(month1) || !this.isValidMMYYYY(month2)) {
      throw new Error('Invalid MM-YYYY format');
    }

    const [m1, y1] = month1.split('-').map(Number);
    const [m2, y2] = month2.split('-').map(Number);

    if (y1 !== y2) {
      return y1 - y2;
    }
    return m1 - m2;
  }

  getMonthsBetween(startMonth: string, endMonth: string): string[] {
    if (!this.isValidMMYYYY(startMonth) || !this.isValidMMYYYY(endMonth)) {
      throw new Error('Invalid MM-YYYY format');
    }

    const months: string[] = [];
    let current = startMonth;

    while (this.compareMonths(current, endMonth) <= 0) {
      months.push(current);
      current = this.addMonths(current, 1);
    }

    return months;
  }

  addMonths(month: string, monthsToAdd: number): string {
    if (!this.isValidMMYYYY(month)) {
      throw new Error('Invalid MM-YYYY format');
    }

    const [m, y] = month.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    date.setMonth(date.getMonth() + monthsToAdd);

    return this.dateToMMYYYY(date);
  }

  subtractMonths(month: string, monthsToSubtract: number): string {
    return this.addMonths(month, -monthsToSubtract);
  }

  dateToMMYYYY(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${year}`;
  }

  mmyyyyToFirstOfMonth(month: string): Date {
    if (!this.isValidMMYYYY(month)) {
      throw new Error('Invalid MM-YYYY format');
    }

    const [m, y] = month.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }

  // Utility to check if month is in forecast period
  isInForecastPeriod(month: string, periods: PeriodConfiguration): boolean {
    return periods.forecastMonths.includes(month);
  }

  // Utility to check if month is in actual period
  isInActualPeriod(month: string, periods: PeriodConfiguration): boolean {
    return periods.actualMonths.includes(month);
  }
}
