import { checkForecastConnection, validateForecastGraph } from '../graph-validation';

const node = (id: string, type: string, data: Record<string, unknown>) => ({ id, type, data, position: { x: 0, y: 0 } });
const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });

describe('validateForecastGraph', () => {
  // M = SEED(M) * 1.1, with the metric also drawn into its SEED on the canvas.
  const nodes = [
    node('m', 'METRIC', { label: 'Revenue', useCalculated: true, historicalVariableId: 'v', budgetVariableId: '' }),
    node('s', 'SEED', { sourceMetricId: 'm' }),
    node('g', 'CONSTANT', { name: 'growth', value: 1.1 }),
    node('o', 'OPERATOR', { op: '*', inputOrder: ['s', 'g'] }),
  ];
  const edges = [edge('m', 's'), edge('s', 'o'), edge('g', 'o'), edge('o', 'm')];

  it('accepts a self-seeded growth metric, including a Metric -> SEED edge', () => {
    const result = validateForecastGraph(nodes, edges);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports a same-month cycle as a message and as a structured issue with its path', () => {
    const result = validateForecastGraph(nodes, [...edges, edge('m', 'o')]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/Circular dependency within the same month/);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CYCLE', nodeIds: ['m', 'o'], path: ['m', 'o', 'm'] })])
    );
  });
});

describe('checkForecastConnection', () => {
  const nodes = [
    node('m', 'METRIC', { label: 'M' }),
    node('c', 'CONSTANT', { value: 1 }),
    node('o', 'OPERATOR', { op: '+', inputOrder: ['c'] }),
  ];
  const edges = [edge('c', 'o'), edge('o', 'm')];

  it('rejects an edge that closes a cycle and allows one that does not', () => {
    expect(checkForecastConnection(nodes, edges, { source: 'm', target: 'o' }).map((i) => i.code)).toEqual(['CYCLE']);
    expect(checkForecastConnection(nodes, [edge('o', 'm')], { source: 'c', target: 'o' })).toEqual([]);
  });
});
