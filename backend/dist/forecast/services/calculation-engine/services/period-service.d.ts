import { PeriodConfiguration, MonthUtility, ValidationResult } from '../types/calculation-types';
export declare class PeriodService implements MonthUtility {
    processPeriods(periods: {
        forecast: {
            start: string;
            end: string;
        };
        actual: {
            start: string;
            end: string;
        };
    }): PeriodConfiguration;
    validatePeriods(periods: {
        forecast: {
            start: string;
            end: string;
        };
        actual: {
            start: string;
            end: string;
        };
    }): ValidationResult;
    isValidMMYYYY(month: string): boolean;
    compareMonths(month1: string, month2: string): number;
    getMonthsBetween(startMonth: string, endMonth: string): string[];
    addMonths(month: string, monthsToAdd: number): string;
    subtractMonths(month: string, monthsToSubtract: number): string;
    dateToMMYYYY(date: Date): string;
    mmyyyyToFirstOfMonth(month: string): Date;
    isInForecastPeriod(month: string, periods: PeriodConfiguration): boolean;
    isInActualPeriod(month: string, periods: PeriodConfiguration): boolean;
}
