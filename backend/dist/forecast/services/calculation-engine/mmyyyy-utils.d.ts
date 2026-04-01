import type { MMYYYYUtils } from './types';
export declare class MMYYYYUtilsService implements MMYYYYUtils {
    private readonly MM_YYYY_PATTERN;
    isValidMMYYYY(month: string): boolean;
    addMonths(month: string, monthsToAdd: number): string;
    subtractMonths(month: string, monthsToSubtract: number): string;
    compareMonths(month1: string, month2: string): number;
    getMonthsBetween(startMonth: string, endMonth: string): string[];
    dateToMMYYYY(date: Date): string;
    mmyyyyToFirstOfMonth(month: string): Date;
}
