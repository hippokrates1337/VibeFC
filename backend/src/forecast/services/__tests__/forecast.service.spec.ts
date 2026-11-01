import { BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { ForecastService } from '../forecast.service';
import { fakeSupabase, rlsError, type RecordedQuery, type FakeResult } from '../../../common/testing/fake-supabase';

Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();

const request = { headers: { authorization: 'Bearer t' } } as any;
const performance = { trackOperation: (_name: string, operation: () => unknown) => operation() } as any;

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'f1',
  name: 'Plan',
  organization_id: 'org-1',
  user_id: 'u1',
  forecast_start_date: '2026-01-01',
  forecast_end_date: '2026-12-31',
  forecast_start_month: '01-2026',
  forecast_end_month: '12-2026',
  actual_start_month: '07-2025',
  actual_end_month: '12-2025',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

function setup(respond: (query: RecordedQuery) => FakeResult = (q) => (q.op === 'select' ? { data: row() } : { data: { id: 'f1' } })) {
  const db = fakeSupabase(respond);
  return { db, service: new ForecastService(db.supabaseService, performance) };
}
const writes = (queries: RecordedQuery[]) => queries.filter((q) => q.op !== 'select');

describe('ForecastService', () => {
  describe('create', () => {
    const dto = { name: 'Plan', organizationId: 'org-1', forecastStartDate: '2026-01-01', forecastEndDate: '2026-12-31' };

    it('derives the forecast months from the dates and defaults the actual window to the 6 months before', async () => {
      const { db, service } = setup(() => ({ data: row() }));

      await service.create('u1', dto as any, request);

      expect(db.queries[0].payload).toMatchObject({
        forecast_start_month: '01-2026',
        forecast_end_month: '12-2026',
        actual_start_month: '07-2025',
        actual_end_month: '12-2025',
      });
    });

    it('rejects an end date before the start date and an actual window that runs backwards, before writing', async () => {
      const { db, service } = setup();

      await expect(service.create('u1', { ...dto, forecastEndDate: '2025-12-31' } as any, request)).rejects.toThrow(
        /end date \(2025-12-31\) is before the start date/
      );
      await expect(
        service.create('u1', { ...dto, actualStartMonth: '12-2025', actualEndMonth: '06-2025' } as any, request)
      ).rejects.toThrow(/actual period ends \(06-2025\) before it starts/);
      expect(db.queries).toHaveLength(0);
    });

    it('answers 403 without the database text when the caller may not write (viewer)', async () => {
      const { service } = setup(() => ({ error: rlsError }));

      const error = await service.create('u1', dto as any, request).catch((e) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toBe('You do not have permission to create a forecast in this organization');
    });
  });

  describe('findOne', () => {
    it('answers 404 for a forecast the caller cannot read', async () => {
      const { service } = setup(() => ({ data: null }));
      await expect(service.findOne('f1', 'u1', request)).rejects.toThrow(new NotFoundException('Forecast not found'));
    });

    it('answers 400, not 500, for invalid input the database rejects', async () => {
      const { service } = setup(() => ({ error: { code: '22P02', message: 'invalid input syntax for type uuid' } }));
      await expect(service.findOne('x', 'u1', request)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('re-derives the forecast months when the dates change', async () => {
      const { db, service } = setup();

      await service.update('f1', 'u1', { forecastEndDate: '2027-06-30' }, request);

      expect(writes(db.queries)[0].payload).toMatchObject({ forecast_start_month: '01-2026', forecast_end_month: '06-2027' });
    });

    it('rejects dates that end before they start after merging with the stored ones', async () => {
      const { db, service } = setup();

      await expect(service.update('f1', 'u1', { forecastStartDate: '2027-01-01' }, request)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(writes(db.queries)).toHaveLength(0);
    });

    it('answers 403 when the update reaches no row (row-level security)', async () => {
      const { service } = setup((q) => (q.op === 'select' ? { data: row() } : { data: null }));
      await expect(service.update('f1', 'u1', { name: 'New' }, request)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updatePeriods', () => {
    it('checks the merged periods and writes all four', async () => {
      const { db, service } = setup();

      await expect(service.updatePeriods('f1', 'u1', { actualStartMonth: '01-2026' }, request)).rejects.toThrow(
        /actual period ends \(12-2025\) before it starts \(01-2026\)/
      );
      await service.updatePeriods('f1', 'u1', { actualStartMonth: '01-2025' }, request);

      expect(writes(db.queries)).toHaveLength(1);
      expect(writes(db.queries)[0].payload).toMatchObject({
        forecast_start_month: '01-2026',
        forecast_end_month: '12-2026',
        actual_start_month: '01-2025',
        actual_end_month: '12-2025',
      });
    });
  });

  describe('remove', () => {
    it('deletes the forecast, and answers 403 when nothing was deleted', async () => {
      let deleted = 1;
      const { db, service } = setup((q) => (q.op === 'select' ? { data: row() } : { count: deleted }));

      await expect(service.remove('f1', 'u1', request)).resolves.toBeUndefined();
      expect(writes(db.queries)[0].options).toEqual({ count: 'exact' });

      deleted = 0;
      await expect(service.remove('f1', 'u1', request)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('bulkSaveGraph', () => {
    const graph = (forecast: Record<string, unknown>) => ({ forecast: { name: 'Plan', forecastStartDate: '2026-01-01', forecastEndDate: '2026-12-31', ...forecast }, nodes: [], edges: [] });

    it('checks the periods before calling the database function', async () => {
      const { db, service } = setup();

      await expect(service.bulkSaveGraph('f1', 'u1', graph({ forecastEndDate: '2025-06-30' }) as any, request)).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(db.rpcCalls).toHaveLength(0);
    });

    it('maps an error raised by the function to 400 without its text', async () => {
      const { db, service } = setup();
      db.setRpcResult({ error: { code: 'P0001', message: 'Invalid edge client reference: x' } });

      const error = await service.bulkSaveGraph('f1', 'u1', graph({}) as any, request).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).not.toContain('client reference');
    });

    it('saves through the database function', async () => {
      const { db, service } = setup();
      db.setRpcResult({ data: { id: 'f1', nodes: [], edges: [] } });

      await expect(service.bulkSaveGraph('f1', 'u1', graph({}) as any, request)).resolves.toMatchObject({ id: 'f1' });
      expect(db.rpcCalls[0]).toMatchObject({ name: 'bulk_save_forecast_graph', args: { p_forecast_id: 'f1' } });
    });
  });
});
