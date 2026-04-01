import { Test, type TestingModule } from '@nestjs/testing';
import { SeedNodeStrategy } from './seed-node-strategy';
import { PeriodService } from '../services/period-service';
import {
  CalculationContext,
  CalculationTreeNode,
  MetricNodeAttributes,
  SeedNodeAttributes
} from '../types/calculation-types';
import { VariableDataService } from '../variable-data-service';

describe('SeedNodeStrategy', () => {
  let strategy: SeedNodeStrategy;
  let variableDataService: { getVariableValue: jest.Mock };

  const metricId = 'metric-source-1';
  const historicalVarId = 'hist-var-uuid';

  const metricNode: CalculationTreeNode = {
    nodeId: metricId,
    nodeType: 'METRIC',
    nodeData: {
      label: 'Source',
      budgetVariableId: 'b',
      historicalVariableId: historicalVarId,
      useCalculated: false
    } as MetricNodeAttributes,
    children: []
  };

  const seedNode: CalculationTreeNode = {
    nodeId: 'seed-1',
    nodeType: 'SEED',
    nodeData: { sourceMetricId: metricId } as SeedNodeAttributes,
    children: []
  };

  const logger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  const makeCache = () => {
    const store = new Map<string, number | null | undefined>();
    return {
      generateKey: (nodeId: string, m: string, ct: string) => `${nodeId}|${m}|${ct}`,
      get: (k: string) => store.get(k),
      set: (k: string, v: number | null) => {
        store.set(k, v);
      },
      clear: () => store.clear()
    };
  };

  beforeEach(async () => {
    variableDataService = {
      getVariableValue: jest.fn().mockResolvedValue(null)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedNodeStrategy,
        PeriodService,
        { provide: VariableDataService, useValue: variableDataService }
      ]
    }).compile();

    strategy = module.get<SeedNodeStrategy>(SeedNodeStrategy);
  });

  it('forecast on actual-only month returns same-month historical from variable', async () => {
    variableDataService.getVariableValue.mockResolvedValue(11222985);

    const cache = makeCache();
    const context: CalculationContext = {
      variables: [],
      periods: {
        forecastMonths: ['04-2026', '05-2026'],
        actualMonths: ['03-2026', '04-2026'],
        allMonths: []
      },
      cache: cache as any,
      nodeResults: new Map(),
      request: {
        trees: [{ rootMetricNodeId: metricId, tree: metricNode }]
      } as any,
      logger,
      runningMetricForecasts: new Map()
    };

    const out = await strategy.evaluate(seedNode, '03-2026', 'forecast', context);

    expect(out).toBe(11222985);
    expect(variableDataService.getVariableValue).toHaveBeenCalledWith(
      historicalVarId,
      expect.any(Date),
      []
    );
    const marchDate = variableDataService.getVariableValue.mock.calls[0][1] as Date;
    expect(marchDate.getMonth()).toBe(2);
    expect(marchDate.getFullYear()).toBe(2026);
  });

  it('forecast on actual-only month falls back to nodeResults historical when variable is null', async () => {
    variableDataService.getVariableValue.mockResolvedValue(null);

    const cache = makeCache();
    const context: CalculationContext = {
      variables: [],
      periods: {
        forecastMonths: ['04-2026'],
        actualMonths: ['03-2026'],
        allMonths: []
      },
      cache: cache as any,
      nodeResults: new Map([
        [
          metricId,
          {
            nodeId: metricId,
            nodeType: 'METRIC',
            values: [
              {
                month: '03-2026',
                historical: 999,
                forecast: null,
                budget: null,
                calculated: null
              }
            ]
          }
        ]
      ]),
      request: {
        trees: [{ rootMetricNodeId: metricId, tree: metricNode }]
      } as any,
      logger,
      runningMetricForecasts: new Map()
    };

    const out = await strategy.evaluate(seedNode, '03-2026', 'forecast', context);

    expect(out).toBe(999);
  });

  it('when month is in both actual and forecast months, uses first-month t-1 not same-month historical', async () => {
    variableDataService.getVariableValue.mockResolvedValue(777);

    const cache = makeCache();
    const context: CalculationContext = {
      variables: [],
      periods: {
        forecastMonths: ['03-2026', '04-2026'],
        actualMonths: ['03-2026', '04-2026'],
        allMonths: []
      },
      cache: cache as any,
      nodeResults: new Map(),
      request: {
        trees: [{ rootMetricNodeId: metricId, tree: metricNode }]
      } as any,
      logger,
      runningMetricForecasts: new Map()
    };

    await strategy.evaluate(seedNode, '03-2026', 'forecast', context);

    expect(variableDataService.getVariableValue).toHaveBeenCalled();
    const argDate = variableDataService.getVariableValue.mock.calls[0][1] as Date;
    expect(argDate.getMonth()).toBe(1);
    expect(argDate.getFullYear()).toBe(2026);
  });
});
