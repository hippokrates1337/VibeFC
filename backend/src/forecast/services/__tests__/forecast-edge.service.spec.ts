import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { ForecastEdgeService } from '../forecast-edge.service';
import { ForecastNodeService } from '../forecast-node.service';
import { fakeSupabase } from '../../../common/testing/fake-supabase';

Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();

const request = { headers: { authorization: 'Bearer t' } } as any;
const edgeRow = { id: 'e1', forecast_id: 'f1', source_node_id: 'a', target_node_id: 'b', created_at: '2026-01-01' };
const nodeRow = (id: string) => ({ id, forecast_id: 'f1', kind: 'CONSTANT', attributes: {}, position: { x: 0, y: 0 } });

function setup(respond: Parameters<typeof fakeSupabase>[0]) {
  const db = fakeSupabase(respond);
  const service = new ForecastEdgeService(db.supabaseService, new ForecastNodeService(db.supabaseService));
  return { db, service };
}

describe('ForecastEdgeService', () => {
  it('connects two nodes of the same forecast', async () => {
    const { db, service } = setup((q) =>
      q.table === 'forecast_nodes' ? { data: nodeRow(db.eqValue(q, 'id') as string) } : { data: edgeRow }
    );

    const edge = await service.create({ forecastId: 'f1', sourceNodeId: 'a', targetNodeId: 'b' }, request);

    expect(edge).toMatchObject({ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' });
    // both nodes were looked up within f1
    expect(db.queries.filter((q) => q.table === 'forecast_nodes').map((q) => db.eqValue(q, 'forecast_id'))).toEqual(['f1', 'f1']);
  });

  it('refuses a node of another forecast', async () => {
    const { db, service } = setup((q) =>
      q.table === 'forecast_nodes' && db.eqValue(q, 'id') === 'foreign' ? { data: null } : { data: nodeRow('a') }
    );

    await expect(service.create({ forecastId: 'f1', sourceNodeId: 'a', targetNodeId: 'foreign' }, request)).rejects.toThrow(
      new NotFoundException('Target node not found in this forecast')
    );
    expect(db.queries.some((q) => q.op === 'insert')).toBe(false);
  });

  it('only finds and deletes an edge within its own forecast', async () => {
    const { db, service } = setup(() => ({ data: null }));

    await expect(service.findOne('f-other', 'e1', request)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('f-other', 'e1', request)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.queries.every((q) => db.eqValue(q, 'forecast_id') === 'f-other')).toBe(true);
    expect(db.queries.some((q) => q.op === 'delete')).toBe(false);
  });

  it('reports 403 when row-level security keeps the edge (viewer), 204 when deleted', async () => {
    let deleted = 0;
    const { service } = setup((q) => (q.op === 'select' ? { data: edgeRow } : { count: deleted }));

    await expect(service.remove('f1', 'e1', request)).rejects.toBeInstanceOf(ForbiddenException);
    deleted = 1;
    await expect(service.remove('f1', 'e1', request)).resolves.toBeUndefined();
  });
});
