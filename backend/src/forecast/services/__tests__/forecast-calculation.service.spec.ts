/**
 * ForecastCalculationService with the real forecast engine; only the database and the
 * data services are mocked. Ports the scenarios of the old forecast-calculation-integration
 * test, whose engine was mocked.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { ForecastCalculationService } from '../forecast-calculation.service';
import { ForecastEngineService } from '../forecast-engine.service';
import { CalculationTypeDto, UnifiedCalculationResultDto } from '../../dto/calculation.dto';

const request = { headers: { authorization: 'Bearer test-token' } } as unknown as Request;
const ALL_TYPES = [CalculationTypeDto.HISTORICAL, CalculationTypeDto.FORECAST, CalculationTypeDto.BUDGET];

const node = (id: string, kind: string, attributes: Record<string, unknown>) => ({
  id,
  forecastId: 'forecast-1',
  kind,
  attributes,
  position: { x: 0, y: 0 },
});
const edge = (source: string, target: string) => ({
  id: `${source}->${target}`,
  forecastId: 'forecast-1',
  sourceNodeId: source,
  targetNodeId: target,
});
const metric = (id: string, extra: Record<string, unknown> = {}) =>
  node(id, 'METRIC', { label: id, useCalculated: true, historicalVariableId: 'var-actual', budgetVariableId: 'var-budget', ...extra });

const variables = [
  {
    id: 'var-actual',
    name: 'Revenue actuals',
    type: 'ACTUAL',
    organization_id: 'org-1',
    values: [
      { date: '2023-10-01', value: 1000 },
      { date: '2023-11-01', value: 1100 },
      { date: '2023-12-01', value: 1200 },
    ],
  },
  {
    id: 'var-budget',
    name: 'Revenue budget',
    type: 'BUDGET',
    organization_id: 'org-1',
    values: [
      { date: '2024-01-01', value: 1300 },
      { date: '2024-02-01', value: 1400 },
      { date: '2024-03-01', value: 1500 },
    ],
  },
  {
    id: 'var-input',
    name: 'Leads',
    type: 'INPUT',
    organization_id: 'org-1',
    // Timestamps with an offset and numeric strings, as they can come out of the database.
    values: [
      { date: '2024-01-01T00:00:00+01:00', value: '10' },
      { date: '2024-02-01T00:00:00.000Z', value: 20 },
      { date: '2024-03-01', value: 30 },
    ],
  },
];

function setup(graph: { nodes: unknown[]; edges: unknown[] }, forecast: Record<string, unknown> = {}) {
  const inserted: any[] = [];
  const client = {
    from: jest.fn().mockImplementation(() => ({
      insert: jest.fn().mockImplementation((row) => {
        inserted.push(row);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'result-1', forecast_id: row.forecast_id, calculated_at: row.calculated_at, results: row.results }, error: null }),
          }),
        };
      }),
    })),
  };
  const forecastService = {
    findOne: jest.fn().mockResolvedValue({
      id: 'forecast-1',
      organizationId: 'org-1',
      forecastStartDate: '2024-01-01',
      forecastEndDate: '2024-03-31',
      ...forecast,
    }),
  };
  const service = new ForecastCalculationService(
    { getClientForRequest: () => client } as any,
    { getVariablesByUser: jest.fn().mockResolvedValue({ variables }) } as any,
    forecastService as any,
    { findByForecast: jest.fn().mockResolvedValue(graph.nodes) } as any,
    { findByForecast: jest.fn().mockResolvedValue(graph.edges) } as any,
    new ForecastEngineService()
  );
  return { service, inserted, forecastService };
}

const calculate = (service: ForecastCalculationService, types = ALL_TYPES, includeIntermediateNodes = true) =>
  service.calculateForecastWithPeriods('forecast-1', 'user-1', request, { calculationTypes: types, includeIntermediateNodes });

function series(result: UnifiedCalculationResultDto, nodeId: string, type: 'historical' | 'forecast' | 'budget') {
  const found = [...result.metrics, ...(result.allNodes ?? [])].find((n) => n.nodeId === nodeId)!;
  return Object.fromEntries(found.values.map((v) => [v.month, v[type]]));
}

describe('ForecastCalculationService', () => {
  it('constant -> metric, all calc types, default actual window', async () => {
    const { service } = setup({ nodes: [node('c', 'CONSTANT', { value: 1000 }), metric('m')], edges: [edge('c', 'm')] });
    const result = await calculate(service);
    expect(result.periodInfo).toEqual({
      forecastStartMonth: '01-2024',
      forecastEndMonth: '03-2024',
      actualStartMonth: '07-2023',
      actualEndMonth: '12-2023',
    });
    expect(series(result, 'm', 'forecast')).toMatchObject({ '01-2024': 1000, '02-2024': 1000, '03-2024': 1000 });
    expect(series(result, 'm', 'historical')).toMatchObject({ '07-2023': 1000, '12-2023': 1000, '01-2024': null });
  });

  it('metric with useCalculated = false reads its historical and budget variables', async () => {
    const { service } = setup({ nodes: [node('c', 'CONSTANT', { value: 1000 }), metric('m', { useCalculated: false })], edges: [edge('c', 'm')] });
    const result = await calculate(service);
    expect(series(result, 'm', 'historical')).toMatchObject({ '10-2023': 1000, '11-2023': 1100, '12-2023': 1200, '09-2023': null });
    expect(series(result, 'm', 'budget')).toMatchObject({ '01-2024': 1300, '02-2024': 1400, '03-2024': 1500 });
  });

  it('operator chain 1000 * 1.1', async () => {
    const { service } = setup({
      nodes: [node('c1', 'CONSTANT', { value: 1000 }), node('c2', 'CONSTANT', { value: 1.1 }), node('o', 'OPERATOR', { op: '*', inputOrder: ['c1', 'c2'] }), metric('m')],
      edges: [edge('c1', 'o'), edge('c2', 'o'), edge('o', 'm')],
    });
    const result = await calculate(service, [CalculationTypeDto.FORECAST]);
    expect(series(result, 'm', 'forecast')['01-2024']).toBeCloseTo(1100, 9);
  });

  it('SEED growth starts from the last actual', async () => {
    const { service } = setup({
      nodes: [
        node('s', 'SEED', { sourceMetricId: 'm' }),
        node('g', 'CONSTANT', { value: 1.05 }),
        node('o', 'OPERATOR', { op: '*', inputOrder: ['s', 'g'] }),
        metric('m'),
      ],
      edges: [edge('s', 'o'), edge('g', 'o'), edge('o', 'm')],
    });
    const result = await calculate(service, [CalculationTypeDto.FORECAST]);
    const forecast = series(result, 'm', 'forecast');
    expect(forecast['01-2024']).toBeCloseTo(1260, 9);
    expect(forecast['02-2024']).toBeCloseTo(1323, 9);
    expect(forecast['03-2024']).toBeCloseTo(1389.15, 9);
  });

  it('DATA reads the calendar month as written, whatever the time zone', async () => {
    const { service } = setup({
      nodes: [node('d', 'DATA', { name: 'Leads', variableId: 'var-input', offsetMonths: 0 }), metric('m')],
      edges: [edge('d', 'm')],
    });
    const result = await calculate(service, [CalculationTypeDto.FORECAST]);
    expect(series(result, 'm', 'forecast')).toMatchObject({ '01-2024': 10, '02-2024': 20, '03-2024': 30 });
  });

  it('50 constants summed through 26 operators', async () => {
    const nodes: unknown[] = [];
    const edges: unknown[] = [];
    for (let i = 0; i < 50; i++) nodes.push(node(`c${i}`, 'CONSTANT', { value: i + 1 }));
    for (let i = 0; i < 25; i++) {
      nodes.push(node(`o${i}`, 'OPERATOR', { op: '+', inputOrder: [`c${2 * i}`, `c${2 * i + 1}`] }));
      edges.push(edge(`c${2 * i}`, `o${i}`), edge(`c${2 * i + 1}`, `o${i}`), edge(`o${i}`, 'final'));
    }
    nodes.push(node('final', 'OPERATOR', { op: '+', inputOrder: Array.from({ length: 25 }, (_, i) => `o${i}`) }), metric('m'));
    edges.push(edge('final', 'm'));
    const { service } = setup({ nodes, edges });
    const result = await calculate(service, [CalculationTypeDto.FORECAST]);
    expect(series(result, 'm', 'forecast')['01-2024']).toBe(1275);
  });

  it('stores lower-case types and responds with upper-case ones, as before', async () => {
    const { service, inserted } = setup({ nodes: [node('c', 'CONSTANT', { value: 1 }), metric('m')], edges: [edge('c', 'm')] });
    const result = await calculate(service, [CalculationTypeDto.FORECAST], false);
    expect(result.id).toBe('result-1');
    expect(result.calculationTypes).toEqual(['FORECAST']);
    expect(result.allNodes).toEqual([]);
    expect(result.metrics.map((m) => m.nodeId)).toEqual(['m']);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ forecast_id: 'forecast-1', organization_id: 'org-1' });
    expect(inserted[0].results.calculationTypes).toEqual(['forecast']);
    expect(inserted[0].results.metrics[0].values[0]).toEqual({ month: '07-2023', historical: null, forecast: null, budget: null, calculated: null });
  });

  it('ends an overlapping actual window before the forecast starts', async () => {
    const { service } = setup(
      { nodes: [node('c', 'CONSTANT', { value: 1 }), metric('m')], edges: [edge('c', 'm')] },
      { actualStartMonth: '10-2023', actualEndMonth: '02-2024' }
    );
    const result = await calculate(service, [CalculationTypeDto.FORECAST]);
    expect(result.periodInfo).toMatchObject({ actualStartMonth: '10-2023', actualEndMonth: '12-2023' });
  });

  it('rejects a missing forecast', async () => {
    const { service, forecastService } = setup({ nodes: [], edges: [] });
    forecastService.findOne.mockResolvedValue(null);
    await expect(calculate(service)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a same-month cycle with 400 and the cycle path', async () => {
    const { service, inserted } = setup({
      nodes: [node('a', 'OPERATOR', { op: '+', inputOrder: ['b'] }), node('b', 'OPERATOR', { op: '*', inputOrder: ['a'] }), metric('m')],
      edges: [edge('a', 'b'), edge('b', 'a'), edge('b', 'm')],
    });
    const error = await calculate(service).catch((e) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toMatchObject({
      errors: [expect.objectContaining({ code: 'CYCLE', nodeIds: ['a', 'b'], path: ['a', 'b', 'a'] })],
    });
    expect(inserted).toHaveLength(0);
  });

  it('a variable that is not loaded gives empty values, not an error', async () => {
    const { service } = setup({
      nodes: [node('d', 'DATA', { name: 'x', variableId: 'missing', offsetMonths: 0 }), metric('m')],
      edges: [edge('d', 'm')],
    });
    const result = await calculate(service, [CalculationTypeDto.FORECAST]);
    expect(Object.values(series(result, 'm', 'forecast')).every((v) => v === null)).toBe(true);
  });
});
