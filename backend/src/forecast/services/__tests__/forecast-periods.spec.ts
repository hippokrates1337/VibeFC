import { BadRequestException } from '@nestjs/common';
import { assertDateOrder, assertValidPeriods, defaultActualWindow, isoDateToMonth, storedPeriods } from '../forecast-periods';

const periods = { forecastStartMonth: '01-2026', forecastEndMonth: '12-2026', actualStartMonth: '07-2025', actualEndMonth: '12-2025' };

describe('forecast periods', () => {
  it('reads the month of an ISO date as written, whatever its time or offset', () => {
    expect(isoDateToMonth('2026-03-31', 'd')).toBe('03-2026');
    expect(isoDateToMonth('2026-03-31T23:30:00-05:00', 'd')).toBe('03-2026');
    for (const bad of ['2026-03', '20260301', '2026-13-01', '']) {
      expect(() => isoDateToMonth(bad, 'forecastStartDate')).toThrow(BadRequestException);
    }
  });

  it('defaults the actual window to the 6 months before the forecast, across a year', () => {
    expect(defaultActualWindow('03-2026')).toEqual({ actualStartMonth: '09-2025', actualEndMonth: '02-2026' });
  });

  it('accepts forward windows, including an actual window that overlaps the forecast', () => {
    expect(() => assertValidPeriods(periods)).not.toThrow();
    expect(() => assertValidPeriods({ ...periods, actualEndMonth: '03-2026' })).not.toThrow();
    expect(() => assertValidPeriods({ ...periods, forecastEndMonth: '01-2026' })).not.toThrow();
  });

  it('names every problem in one 400', () => {
    expect(() => assertValidPeriods({ ...periods, forecastEndMonth: '12-2025', actualStartMonth: '13-2025' })).toThrow(
      'Invalid forecast periods: actualStartMonth must be in MM-YYYY format'
    );
    expect(() => assertValidPeriods({ ...periods, forecastEndMonth: '12-2025', actualStartMonth: '01-2026' })).toThrow(
      'Invalid forecast periods: the forecast period ends (12-2025) before it starts (01-2026); the actual period ends (12-2025) before it starts (01-2026)'
    );
  });

  it('compares dates as written', () => {
    expect(() => assertDateOrder('2026-01-01', '2026-01-01T00:00:00Z')).not.toThrow();
    expect(() => assertDateOrder('2026-02-01', '2026-01-31')).toThrow(BadRequestException);
  });

  it('fills missing stored months like the calculation does', () => {
    expect(storedPeriods({ forecastStartDate: '2026-04-01', forecastEndDate: '2026-09-30' })).toEqual({
      forecastStartMonth: '04-2026',
      forecastEndMonth: '09-2026',
      actualStartMonth: '10-2025',
      actualEndMonth: '03-2026',
    });
  });
});
