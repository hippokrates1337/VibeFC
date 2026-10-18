import { DebugCalculationService, buildDebugTree, toDebugSteps } from '../debug-calculation.service';
import { ForecastCalculationService } from '../forecast-calculation.service';
import { DebugCalculationStep } from '../../types/debug-types';
import type { TraceStep } from '@vibefc/forecast-engine';

const node = (id: string, kind: string, attributes: Record<string, unknown>) =>
  ({ id, forecastId: 'f', kind, attributes, position: { x: 1, y: 2 } }) as any;
const edge = (source: string, target: string) =>
  ({ id: `${source}->${target}`, forecastId: 'f', sourceNodeId: source, targetNodeId: target }) as any;

describe('DebugCalculationService.getCalculationSteps', () => {
  const step = (nodeId: string): DebugCalculationStep =>
    ({ nodeId, stepNumber: 1 }) as unknown as DebugCalculationStep;

  let service: DebugCalculationService;

  beforeEach(() => {
    service = new DebugCalculationService({} as ForecastCalculationService);
  });

  type StoreSteps = (userId: string, forecastId: string, steps: DebugCalculationStep[]) => void;

  // storeSteps is called at the end of calculateWithDebug
  const storeSteps: StoreSteps = (userId, forecastId, steps) =>
    (service as unknown as { storeSteps: StoreSteps }).storeSteps(userId, forecastId, steps);

  it('returns only the steps of the same user and forecast', async () => {
    storeSteps('user-a', 'forecast-1', [step('a1')]);
    storeSteps('user-b', 'forecast-1', [step('b1')]);

    await expect(service.getCalculationSteps('forecast-1', 'user-a')).resolves.toEqual([step('a1')]);
    await expect(service.getCalculationSteps('forecast-1', 'user-b')).resolves.toEqual([step('b1')]);
    await expect(service.getCalculationSteps('forecast-1', 'user-c')).resolves.toEqual([]);
  });

  it('evicts the oldest run beyond the limit', async () => {
    for (let i = 0; i <= 50; i++) {
      storeSteps('user-a', `forecast-${i}`, [step(`n${i}`)]);
    }

    await expect(service.getCalculationSteps('forecast-0', 'user-a')).resolves.toEqual([]);
    await expect(service.getCalculationSteps('forecast-50', 'user-a')).resolves.toEqual([step('n50')]);
  });
});

describe('buildDebugTree', () => {
  // M = X + offset(X, 1) + SEED(M): X is shared, SEED reads M last month.
  const graph = {
    nodes: [
      node('M', 'METRIC', { label: 'Revenue', useCalculated: true }),
      node('X', 'DATA', { name: 'Leads', variableId: 'v', offsetMonths: 0 }),
      node('off', 'OPERATOR', { op: 'offset', offsetMonths: 1, inputOrder: ['X'] }),
      node('S', 'SEED', { sourceMetricId: 'M' }),
      node('sum', 'OPERATOR', { op: '+', inputOrder: ['X', 'off', 'S'] }),
    ],
    edges: [edge('X', 'sum'), edge('X', 'off'), edge('off', 'sum'), edge('S', 'sum'), edge('sum', 'M')],
  };

  it('shows one tree per metric, shared nodes as references, SEEDs as leaves', () => {
    const tree = buildDebugTree(graph);
    expect(tree.metricOrder).toEqual(['M']);
    expect(tree.totalNodes).toBe(5);
    const [root] = tree.trees;
    expect(root).toMatchObject({ nodeId: 'M', label: 'Revenue', position: { x: 1, y: 2 } });
    const sum = root.children[0];
    expect(sum.children.map((c) => [c.nodeId, Boolean(c.isReference)])).toEqual([
      ['X', false],
      ['off', false],
      ['S', false],
    ]);
    expect(sum.children[1].children).toEqual([expect.objectContaining({ nodeId: 'X', isReference: true, children: [] })]);
    expect(sum.children[2].children).toEqual([]);
    expect(tree.dependencyGraph).toMatchObject({ S: ['M'], sum: ['X', 'off', 'S'], M: ['sum'] });
    expect(tree.executionOrder.indexOf('sum')).toBeLessThan(tree.executionOrder.indexOf('M'));
  });

  it('still draws an invalid graph from its raw edges', () => {
    const cyclic = { nodes: graph.nodes, edges: [...graph.edges, edge('M', 'X')] };
    const tree = buildDebugTree(cyclic);
    expect(tree.executionOrder).toEqual([]);
    expect(tree.trees[0].nodeId).toBe('M');
  });
});

describe('toDebugSteps', () => {
  const graph = { nodes: [node('M', 'METRIC', { label: 'M' }), node('S', 'SEED', { sourceMetricId: 'M' })], edges: [] };
  const trace: TraceStep[] = [
    { nodeId: 'M', nodeType: 'METRIC', type: 'forecast', month: 2024 * 12 + 11, phase: 'past', value: 7, inputs: [], variableId: 'h' },
    { nodeId: 'S', nodeType: 'SEED', type: 'forecast', month: 2025 * 12, phase: 'window', value: 7, inputs: [{ nodeId: 'M', lag: 1, month: 2024 * 12 + 11, value: 7 }] },
    { nodeId: 'M', nodeType: 'METRIC', type: 'forecast', month: 2025 * 12, phase: 'window', value: 8, inputs: [] },
  ];

  it('maps months to MM-YYYY and numbers the steps', () => {
    const steps = toDebugSteps(trace, graph, undefined, 100);
    expect(steps[1]).toMatchObject({
      nodeId: 'S',
      stepNumber: 2,
      month: '01-2025',
      calculationType: 'forecast',
      phase: 'window',
      output: 7,
      dependencies: ['M'],
      inputs: [{ nodeId: 'M', lag: 1, month: '12-2024', value: 7 }],
      nodeAttributes: { sourceMetricId: 'M' },
    });
    expect(steps[0].inputs).toEqual([{ variableId: 'h', month: '12-2024', value: 7 }]);
  });

  it('applies the focus filter and the step cap', () => {
    expect(toDebugSteps(trace, graph, ['M'], 100).map((s) => s.stepNumber)).toEqual([1, 2]);
    expect(toDebugSteps(trace, graph, undefined, 1)).toHaveLength(1);
  });
});
