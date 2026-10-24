import {
  checkForecastConnection,
  getConnectionRejection,
  getLoopHighlights,
  validateForecastGraph,
} from '../graph-validation';

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

describe('getConnectionRejection', () => {
  const nodes = [
    node('m', 'METRIC', { label: 'Revenue' }),
    node('c', 'CONSTANT', { name: 'base', value: 2 }),
    node('e', 'CONSTANT', { name: 'exponent', value: 3 }),
    node('x', 'CONSTANT', { name: 'extra', value: 4 }),
    node('o', 'OPERATOR', { op: '+', inputOrder: ['c'] }),
    node('p', 'OPERATOR', { op: '^', inputOrder: [] }),
  ];
  const edges = [edge('c', 'o'), edge('o', 'm')];

  it('returns the first error message when the edge would close a cycle', () => {
    expect(getConnectionRejection(nodes, edges, { source: 'm', target: 'o' })).toMatch(
      /Circular dependency within the same month/
    );
  });

  it('returns null for an edge that adds no error', () => {
    expect(getConnectionRejection(nodes, edges, { source: 'x', target: 'o' })).toBeNull();
  });

  it('refuses a second input into a METRIC', () => {
    expect(getConnectionRejection(nodes, edges, { source: 'x', target: 'm' })).toMatch(/can have only one input/);
  });

  it('allows the first input of a ^ operator although it still needs a second one', () => {
    expect(checkForecastConnection(nodes, edges, { source: 'c', target: 'p' }).map((i) => i.code)).toEqual([
      'INVALID_INPUT_COUNT',
    ]);
    expect(getConnectionRejection(nodes, edges, { source: 'c', target: 'p' })).toBeNull();
  });

  it('refuses a third input into a ^ operator', () => {
    const withOperands = [...edges, edge('c', 'p'), edge('e', 'p')];
    expect(getConnectionRejection(nodes, withOperands, { source: 'x', target: 'p' })).toMatch(
      /needs exactly two inputs/
    );
  });
});

describe('getLoopHighlights', () => {
  const nodes = [
    node('m', 'METRIC', { label: 'M' }),
    node('c', 'CONSTANT', { value: 1 }),
    node('a', 'OPERATOR', { op: '+', inputOrder: ['c', 'm'] }),
    node('b', 'OPERATOR', { op: '+', inputOrder: ['a'] }),
  ];
  const edges = [edge('c', 'a'), edge('a', 'b'), edge('b', 'm'), edge('m', 'a')];

  it('collects the nodes of a cycle and the edges along its path', () => {
    const { issues } = validateForecastGraph(nodes, edges);
    const highlights = getLoopHighlights(issues, edges);

    expect(['a', 'b', 'm'].every((id) => highlights.nodeIds.has(id))).toBe(true);
    expect(highlights.nodeIds.has('c')).toBe(false);
    expect(['a-b', 'b-m', 'm-a'].every((id) => highlights.edgeIds.has(id))).toBe(true);
    expect(highlights.edgeIds.has('c-a')).toBe(false);
  });

  it('ignores issues that are not loops', () => {
    const highlights = getLoopHighlights(
      [{ code: 'OPERATOR_WITHOUT_INPUTS', severity: 'error', message: 'x', nodeIds: ['a'] }],
      edges
    );
    expect(highlights.nodeIds.size).toBe(0);
    expect(highlights.edgeIds.size).toBe(0);
  });

  it('is empty without issues', () => {
    expect(getLoopHighlights(undefined, edges).nodeIds.size).toBe(0);
  });
});
