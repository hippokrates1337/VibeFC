import { BadRequestException } from '@nestjs/common';
import { formatMonth, isValidMonthString, parseMonth } from '@vibefc/forecast-engine';

/** A forecast's months, all 'MM-YYYY'. */
export interface ForecastPeriods {
  forecastStartMonth: string;
  forecastEndMonth: string;
  actualStartMonth: string;
  actualEndMonth: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

/** 'MM-YYYY' of an ISO date (YYYY-MM-DD, optionally with a time) as written; 400 for anything else. */
export function isoDateToMonth(isoDate: string, field: string): string {
  const match = ISO_DATE.exec(isoDate ?? '');
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new BadRequestException(`${field} must be a date in YYYY-MM-DD format`);
  }
  return `${match[2]}-${match[1]}`;
}

/**
 * The stored periods of a forecast, with the same fallbacks as the calculation: forecast
 * months from the dates, actual months the 6 months before the forecast start.
 */
export function storedPeriods(forecast: {
  forecastStartDate: string;
  forecastEndDate: string;
  forecastStartMonth?: string | null;
  forecastEndMonth?: string | null;
  actualStartMonth?: string | null;
  actualEndMonth?: string | null;
}): ForecastPeriods {
  const forecastStartMonth = forecast.forecastStartMonth || isoDateToMonth(forecast.forecastStartDate, 'forecastStartDate');
  const defaults = defaultActualWindow(forecastStartMonth);
  return {
    forecastStartMonth,
    forecastEndMonth: forecast.forecastEndMonth || isoDateToMonth(forecast.forecastEndDate, 'forecastEndDate'),
    actualStartMonth: forecast.actualStartMonth || defaults.actualStartMonth,
    actualEndMonth: forecast.actualEndMonth || defaults.actualEndMonth,
  };
}

/** Default actual window for a forecast start: the 6 months before it. */
export function defaultActualWindow(forecastStartMonth: string): Pick<ForecastPeriods, 'actualStartMonth' | 'actualEndMonth'> {
  const start = parseMonth(forecastStartMonth);
  return { actualStartMonth: formatMonth(start - 6), actualEndMonth: formatMonth(start - 1) };
}

/**
 * 400 unless every month is MM-YYYY and both windows run forwards. The actual window may
 * overlap the forecast window; the calculation ends it before the forecast starts.
 */
export function assertValidPeriods(periods: ForecastPeriods): void {
  const problems: string[] = [];
  for (const [field, value] of Object.entries(periods)) {
    if (!isValidMonthString(value ?? '')) {
      problems.push(`${field} must be in MM-YYYY format`);
    }
  }
  if (problems.length === 0) {
    if (parseMonth(periods.forecastStartMonth) > parseMonth(periods.forecastEndMonth)) {
      problems.push(`the forecast period ends (${periods.forecastEndMonth}) before it starts (${periods.forecastStartMonth})`);
    }
    if (parseMonth(periods.actualStartMonth) > parseMonth(periods.actualEndMonth)) {
      problems.push(`the actual period ends (${periods.actualEndMonth}) before it starts (${periods.actualStartMonth})`);
    }
  }
  if (problems.length > 0) {
    throw new BadRequestException(`Invalid forecast periods: ${problems.join('; ')}`);
  }
}

/** 400 when the end date is before the start date (compared as written, no time zone). */
export function assertDateOrder(startDate: string, endDate: string): void {
  const start = (startDate ?? '').slice(0, 10);
  const end = (endDate ?? '').slice(0, 10);
  if (start && end && end < start) {
    throw new BadRequestException(`Invalid forecast dates: the end date (${end}) is before the start date (${start})`);
  }
}
