import { checkConnection, validateGraph } from '../graph';
import type { ClientEdge, ClientNode, Issue } from '../types';
import { constant, data, edge, metric, offset, op, seed } from './support/builders';

const codes = (issues: readonly Issue[]) => issues.map((i) => i.code).sort();

/** Every consecutive pair in a cycle path must be an edge (data-flow order). */
function expectPathFollowsEdges(path: readonly string[], edges: ClientEdge[], seedSources: Record<string, string> = {}) {
  expect(path[0]).toBe(path[path.length - 1]);
  for (let i = 0; i + 1 < path.length; i++) {
    const [from, to] = [path[i], path[i + 1]];
    const isEdge = edges.some((e) => e.source === from && e.target === to) || seedSources[to] === from;
    expect({ from, to, isEdge }).toEqual({ from, to, isEdge: true });
  }
}

describe('validateGraph', () => {
  it('accepts a simple graph', () => {
    const result = validateGraph([constant('c', 1), metric('m')], [edge('c', 'm')]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires a METRIC', () => {
    expect(codes(validateGraph([constant('c', 1)], []).errors)).toEqual(['NO_METRIC']);
  });

  it('reports a same-month cycle with its component and a path', () => {
    const nodes = [constant('c', 1), op('a', '+', ['c', 'b']), op('b', '*', ['a']), op('x', '+', ['b']), metric('m')];
    const edges = [edge('c', 'a'), edge('b', 'a'), edge('a', 'b'), edge('b', 'x'), edge('x', 'm')];
    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    const cycle = result.errors.find((e) => e.code === 'CYCLE')!;
    expect(cycle.nodeIds).toEqual(['a', 'b']);
    expect(cycle.path).toEqual(['a', 'b', 'a']);
    expectPathFollowsEdges(cycle.path!, edges);
  });

  it('reports a self-loop', () => {
    const result = validateGraph([op('a', '+', ['a']), metric('m')], [edge('a', 'a'), edge('a', 'm')]);
    expect(result.errors.find((e) => e.code === 'CYCLE')).toMatchObject({ nodeIds: ['a'], path: ['a', 'a'] });
  });

  it('reports a cycle that runs through metrics without a lag', () => {
    const nodes = [metric('m1'), metric('m2'), op('a', '+', ['m1']), op('b', '+', ['m2'])];
    const edges = [edge('m1', 'a'), edge('a', 'm2'), edge('m2', 'b'), edge('b', 'm1')];
    const cycle = validateGraph(nodes, edges).errors.find((e) => e.code === 'CYCLE')!;
    expect(cycle.nodeIds).toEqual(['a', 'b', 'm1', 'm2']);
    expectPathFollowsEdges(cycle.path!, edges);
  });

  it('accepts cross-metric SEED recurrences (rejected by the old tree processor)', () => {
    const nodes = [metric('a'), metric('b'), seed('sa', 'a'), seed('sb', 'b')];
    const edges = [edge('sb', 'a'), edge('sa', 'b')];
    expect(validateGraph(nodes, edges).errors).toEqual([]);
  });

  it('accepts a metric feeding its own SEED on the canvas', () => {
    const nodes = [metric('m'), seed('s', ''), constant('c', 1), op('add', '+', ['s', 'c'])];
    const edges = [edge('m', 's'), edge('s', 'add'), edge('c', 'add'), edge('add', 'm')];
    expect(validateGraph(nodes, edges).errors).toEqual([]);
  });

  it('rejects a SEED whose edge and sourceMetricId disagree', () => {
    const nodes = [metric('m1'), metric('m2'), seed('s', 'm1'), constant('c', 1)];
    const edges = [edge('m2', 's'), edge('s', 'm1'), edge('c', 'm2')];
    expect(codes(validateGraph(nodes, edges).errors)).toEqual(['SEED_SOURCE_CONFLICT']);
  });

  it('rejects broken SEED sources', () => {
    expect(codes(validateGraph([metric('m'), seed('s', '')], [edge('s', 'm')]).errors)).toEqual(['SEED_WITHOUT_SOURCE']);
    expect(codes(validateGraph([metric('m'), seed('s', 'gone')], [edge('s', 'm')]).errors)).toEqual(['SEED_SOURCE_NOT_FOUND']);
    expect(codes(validateGraph([metric('m'), constant('c', 1), seed('s', 'c')], [edge('s', 'm')]).errors)).toEqual([
      'SEED_SOURCE_NOT_METRIC',
    ]);
    expect(
      codes(validateGraph([metric('m'), constant('c', 1), seed('s', 'm')], [edge('c', 's'), edge('s', 'm')]).errors)
    ).toEqual(['INPUT_NOT_ALLOWED']);
  });

  it('rejects an offset recurrence that never passes a metric', () => {
    // x = offset(y, 1) + 1, y = x: no metric, so no actuals to start from.
    const nodes = [offset('o', 'y', 1), constant('one', 1), op('x', '+', ['o', 'one']), op('y', '+', ['x']), metric('m')];
    const edges = [edge('y', 'o'), edge('o', 'x'), edge('one', 'x'), edge('x', 'y'), edge('y', 'm')];
    const result = validateGraph(nodes, edges);
    const issue = result.errors.find((e) => e.code === 'UNGROUNDED_RECURRENCE')!;
    expect(issue.nodeIds).toEqual(['o', 'x', 'y']);
    expectPathFollowsEdges(issue.path!, edges);
  });

  it('checks operator and metric input counts', () => {
    const r1 = validateGraph([op('o', '+'), metric('m')], [edge('o', 'm')]);
    expect(codes(r1.errors)).toEqual(['OPERATOR_WITHOUT_INPUTS']);
    const r2 = validateGraph(
      [constant('a', 1), constant('b', 2), op('o', 'offset', ['a', 'b'], 1), metric('m')],
      [edge('a', 'o'), edge('b', 'o'), edge('o', 'm')]
    );
    expect(codes(r2.errors)).toEqual(['INVALID_INPUT_COUNT']);
    const r3 = validateGraph(
      [constant('a', 1), constant('b', 2), metric('m')],
      [edge('a', 'm'), edge('b', 'm')]
    );
    expect(codes(r3.errors)).toEqual(['INVALID_INPUT_COUNT']);
    const r4 = validateGraph(
      [constant('a', 1), op('p', '^', ['a']), metric('m')],
      [edge('a', 'p'), edge('p', 'm')]
    );
    expect(codes(r4.errors)).toEqual(['INVALID_INPUT_COUNT']);
  });

  it('checks attributes', () => {
    const offsetWithout = validateGraph(
      [constant('a', 1), op('o', 'offset', ['a']), metric('m')],
      [edge('a', 'o'), edge('o', 'm')]
    );
    expect(codes(offsetWithout.errors)).toEqual(['INVALID_OFFSET']);
    const negative = validateGraph([constant('a', 1), offset('o', 'a', -1), metric('m')], [edge('a', 'o'), edge('o', 'm')]);
    expect(codes(negative.errors)).toEqual(['INVALID_OFFSET']);
    const badOp = validateGraph([constant('a', 1), op('o', '%', ['a']), metric('m')], [edge('a', 'o'), edge('o', 'm')]);
    expect(codes(badOp.errors)).toEqual(['INVALID_OPERATOR']);
    const badConstant = validateGraph([constant('a', NaN), metric('m')], [edge('a', 'm')]);
    expect(codes(badConstant.errors)).toEqual(['INVALID_CONSTANT']);
    const unknown = validateGraph([{ id: 'x', type: 'WIDGET', data: {} }, metric('m')], []);
    expect(codes(unknown.errors)).toEqual(['UNKNOWN_NODE_TYPE']);
    const intoData = validateGraph([constant('a', 1), data('d', 'v'), metric('m')], [edge('a', 'd'), edge('d', 'm')]);
    expect(codes(intoData.errors)).toEqual(['INPUT_NOT_ALLOWED']);
  });

  it('reports dangling edges', () => {
    const result = validateGraph([constant('a', 1), metric('m')], [edge('a', 'm'), edge('ghost', 'm', 'e2')]);
    expect(result.errors).toEqual([expect.objectContaining({ code: 'DANGLING_EDGE', edgeIds: ['e2'] })]);
  });

  it('warns about disconnected nodes, unconfigured metrics and data nodes', () => {
    const nodes: ClientNode[] = [
      constant('lonely', 1),
      { id: 'm', type: 'METRIC', data: { useCalculated: false } },
      data('d', ''),
      metric('m2'),
    ];
    const result = validateGraph(nodes, [edge('d', 'm2')]);
    expect(result.isValid).toBe(true);
    expect(codes(result.warnings)).toEqual(
      expect.arrayContaining([
        'DISCONNECTED_NODE',
        'METRIC_WITHOUT_INPUT',
        'METRIC_WITHOUT_HISTORICAL_VARIABLE',
        'METRIC_WITHOUT_BUDGET_VARIABLE',
        'DATA_WITHOUT_VARIABLE',
        'MISSING_LABEL',
      ])
    );
  });

  it('does not depend on node or edge order', () => {
    const nodes = [constant('c', 1), op('a', '+', ['c', 'b']), op('b', '*', ['a']), metric('m'), op('z', '+', ['z'])];
    const edges = [edge('c', 'a'), edge('b', 'a'), edge('a', 'b'), edge('b', 'm'), edge('z', 'z')];
    const forward = validateGraph(nodes, edges);
    const backward = validateGraph([...nodes].reverse(), [...edges].reverse());
    expect(backward).toEqual(forward);
  });
});

describe('checkConnection', () => {
  const nodes = [constant('c', 1), op('a', '+', ['c']), op('b', '+', ['a']), metric('m'), seed('s', 'm')];
  const edges = [edge('c', 'a'), edge('a', 'b'), edge('b', 'm')];

  it('allows an edge that keeps the graph valid', () => {
    expect(checkConnection(nodes, edges, { source: 's', target: 'a' })).toEqual([]);
  });

  it('returns the cycle a new edge would close', () => {
    const issues = checkConnection(nodes, edges, { source: 'm', target: 'a' });
    expect(issues).toEqual([expect.objectContaining({ code: 'CYCLE', path: ['a', 'b', 'm', 'a'] })]);
  });

  it('ignores problems that exist without the new edge', () => {
    const broken = [...edges, edge('b', 'b')];
    expect(checkConnection(nodes, broken, { source: 's', target: 'a' })).toEqual([]);
  });

  it('allows drawing a metric into a SEED', () => {
    expect(checkConnection(nodes, [...edges, edge('s', 'a')], { source: 'm', target: 's' })).toEqual([]);
  });
});
