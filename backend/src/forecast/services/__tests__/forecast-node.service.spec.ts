import { BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { ForecastNodeService } from '../forecast-node.service';
import { ForecastNodeKind } from '../../dto/forecast-node.dto';
import { fakeSupabase, rlsError } from '../../../common/testing/fake-supabase';

Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();

const request = { headers: { authorization: 'Bearer t' } } as any;
const nodeRow = { id: 'n1', forecast_id: 'f1', kind: 'CONSTANT', attributes: { value: 1 }, position: { x: 0, y: 0 }, created_at: '2026-01-01', updated_at: '2026-01-01' };

describe('ForecastNodeService', () => {
  it('creates a node in the given forecast', async () => {
    const db = fakeSupabase(() => ({ data: nodeRow }));
    const service = new ForecastNodeService(db.supabaseService);

    const node = await service.create(
      { forecastId: 'f1', kind: ForecastNodeKind.CONSTANT, attributes: { value: 1 } as any, position: { x: 0, y: 0 } },
      request
    );

    expect(node).toMatchObject({ id: 'n1', forecastId: 'f1', kind: 'CONSTANT' });
    expect(db.queries[0]).toMatchObject({ table: 'forecast_nodes', op: 'insert', payload: expect.objectContaining({ forecast_id: 'f1' }) });
  });

  it('answers 403 without the database text when row-level security refuses the insert (viewer)', async () => {
    const db = fakeSupabase(() => ({ error: rlsError }));
    const service = new ForecastNodeService(db.supabaseService);

    const error = await service
      .create({ forecastId: 'f1', kind: ForecastNodeKind.CONSTANT, attributes: {} as any, position: { x: 0, y: 0 } }, request)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.message).not.toContain('row-level security');
  });

  it('only finds a node within its own forecast', async () => {
    const db = fakeSupabase(() => ({ data: null }));
    const service = new ForecastNodeService(db.supabaseService);

    await expect(service.findOne('f-other', 'n1', request)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.eqValue(db.queries[0], 'forecast_id')).toBe('f-other');
    expect(db.eqValue(db.queries[0], 'id')).toBe('n1');
  });

  it('updates and deletes only within the forecast, and reports 403 when nothing was changed', async () => {
    const db = fakeSupabase((q) => (q.op === 'select' ? { data: nodeRow } : q.op === 'update' ? { data: null } : { count: 0 }));
    const service = new ForecastNodeService(db.supabaseService);

    await expect(service.update('f1', 'n1', { position: { x: 1, y: 1 } }, request)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('f1', 'n1', request)).rejects.toBeInstanceOf(ForbiddenException);

    const writes = db.queries.filter((q) => q.op !== 'select');
    expect(writes.map((q) => [q.op, db.eqValue(q, 'forecast_id'), db.eqValue(q, 'id')])).toEqual([
      ['update', 'f1', 'n1'],
      ['delete', 'f1', 'n1'],
    ]);
    expect(writes[1].options).toEqual({ count: 'exact' });
  });

  it('deletes a node of the forecast', async () => {
    const db = fakeSupabase((q) => (q.op === 'select' ? { data: nodeRow } : { count: 1 }));
    const service = new ForecastNodeService(db.supabaseService);

    await expect(service.remove('f1', 'n1', request)).resolves.toBeUndefined();
  });

  it('maps an invalid value to 400 instead of 500', async () => {
    const db = fakeSupabase(() => ({ error: { code: '22P02', message: 'invalid input syntax for type uuid: "x"' } }));
    const service = new ForecastNodeService(db.supabaseService);

    const error = await service.findByForecast('x', request).catch((e) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).not.toContain('uuid');
  });
});
