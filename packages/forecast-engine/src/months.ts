/**
 * Month indices: `year * 12 + (month - 1)`. Only these helpers convert to and from
 * strings or Dates, and none of them uses local time.
 */
import type { MonthIndex } from './types';

const MM_YYYY = /^(0[1-9]|1[0-2])-(\d{4})$/;
const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})/;

/** `month` is 1-based (1 = January). */
export function monthIndex(year: number, month: number): MonthIndex {
  return year * 12 + (month - 1);
}

export function isValidMonthString(value: string): boolean {
  return MM_YYYY.test(value);
}

/** 'MM-YYYY' -> month index; throws on any other format. */
export function parseMonth(value: string): MonthIndex {
  const match = MM_YYYY.exec(value);
  if (!match) {
    throw new Error(`Invalid month "${value}", expected MM-YYYY`);
  }
  return monthIndex(Number(match[2]), Number(match[1]));
}

/** Month index -> 'MM-YYYY'. */
export function formatMonth(index: MonthIndex): string {
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return `${month < 10 ? '0' : ''}${month}-${year}`;
}

/** The UTC calendar month of a Date. */
export function monthIndexFromDate(date: Date): MonthIndex {
  return monthIndex(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

/**
 * The calendar month of an ISO date string as written ('2024-03-01',
 * '2024-03-01T00:00:00+01:00' -> March 2024), whatever its offset. Other formats fall
 * back to `Date` parsing read in UTC.
 */
export function monthIndexFromDateString(value: string): MonthIndex {
  const match = ISO_DATE_PREFIX.exec(value);
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return monthIndex(Number(match[1]), month);
    }
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date "${value}"`);
  }
  return monthIndexFromDate(date);
}

/** Inclusive; empty when `end < start`. */
export function monthRange(start: MonthIndex, end: MonthIndex): MonthIndex[] {
  const months: MonthIndex[] = [];
  for (let m = start; m <= end; m++) {
    months.push(m);
  }
  return months;
}
