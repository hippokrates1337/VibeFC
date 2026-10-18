/**
 * Golden scenarios with hand-computed results. Each block names the rule in
 * docs/forecast-engine.md it pins down, or the old-engine defect it guards against.
 */
import { calculate } from '../calculate';
import { formatMonth } from '../months';
import type { ClientEdge, ClientNode } from '../types';
import {
  constant,
  data,
  edge,
  input,
  metric,
  offset,
  op,
  rounded,
  run,
  seed,
  series,
  variable,
} from './support/builders';

const ACTUAL: [string, string] = ['10-2024', '12-2024'];
const FORECAST: [string, string] = ['01-2025', '03-2025'];

describe('growth: M = SEED(M) * 1.1', () => {
  const nodes = [
    metric('M', { useCalculated: false, historicalVariableId: 'hist', budgetVariableId: 'bud' }),
    seed('S', 'M'),
    constant('g', 1.1),
    op('mul', '*', ['S', 'g']),
  ];
  const edges = [edge('S', 'mul'), edge('g', 'mul'), edge('mul', 'M')];
  const variables = [
    variable('hist', 'ACTUAL', { '10-2024': 80, '11-2024': 90, '12-2024': 100 }),
    variable('bud', 'BUDGET', { '10-2024': 1, '11-2024': 2, '12-2024': 3, '01-2025': 4, '02-2025': 5, '03-2025': 6 }),
  ];

  it('forecast compounds from the last actual', () => {
    const result = run(nodes, edges, { variables, actual: ACTUAL, forecast: FORECAST });
    expect(rounded(series(result, 'M', 'forecast'))).toEqual({
      '10-2024': null,
      '11-2024': null,
      '12-2024': null,
      '01-2025': 110,
      '02-2025': 121,
      '03-2025': 133.1,
    });
  });

  it('historical and budget read the variables when useCalculated is false', () => {
    const result = run(nodes, edges, { variables, actual: ACTUAL, forecast: FORECAST });
    expect(series(result, 'M', 'historical')).toEqual({
      '10-2024': 80,
      '11-2024': 90,
      '12-2024': 100,
      '01-2025': null,
      '02-2025': null,
      '03-2025': null,
    });
    expect(series(result, 'M', 'budget')).toEqual({
      '10-2024': 1,
      '11-2024': 2,
      '12-2024': 3,
      '01-2025': 4,
      '02-2025': 5,
      '03-2025': 6,
    });
  });

  it('an edge drawn from the metric into its SEED is the seed source, not a cycle', () => {
    const canvasNodes = nodes.map((n) => (n.id === 'S' ? seed('S', '') : n));
    const result = run(canvasNodes, [edge('M', 'S'), ...edges], {
      variables,
      actual: ACTUAL,
      forecast: FORECAST,
      types: ['forecast'],
    });
    expect(rounded(series(result, 'M', 'forecast'))['03-2025']).toBe(133.1);
  });
});

describe('cross-metric recurrence (old defect 1)', () => {
  // M1 = SEED(M2) + 1, M2 = SEED(M1) + 1: the old engine rejected this as a
  // "circular cross-tree SEED dependency" although every month is well-defined.
  const nodes = [
    metric('M1', { historicalVariableId: 'h1' }),
    metric('M2', { historicalVariableId: 'h2' }),
    seed('S1', 'M1'),
    seed('S2', 'M2'),
    constant('one', 1),
    op('add1', '+', ['S2', 'one']),
    op('add2', '+', ['S1', 'one']),
  ];
  const edges = [
    edge('S2', 'add1'),
    edge('one', 'add1'),
    edge('add1', 'M1'),
    edge('S1', 'add2'),
    edge('one', 'add2'),
    edge('add2', 'M2'),
  ];
  const variables = [
    variable('h1', 'ACTUAL', { '12-2024': 10 }),
    variable('h2', 'ACTUAL', { '12-2024': 20 }),
  ];

  it('alternates between the two metrics', () => {
    const result = run(nodes, edges, { variables, actual: ACTUAL, forecast: FORECAST, types: ['forecast'] });
    const m1 = series(result, 'M1', 'forecast');
    const m2 = series(result, 'M2', 'forecast');
    expect([m1['01-2025'], m1['02-2025'], m1['03-2025']]).toEqual([21, 12, 23]);
    expect([m2['01-2025'], m2['02-2025'], m2['03-2025']]).toEqual([11, 22, 13]);
  });
});

describe('self-seeded metric in every calc type (old defect 2)', () => {
  const nodes = [
    metric('M', { useCalculated: true, historicalVariableId: 'h' }),
    seed('S', 'M'),
    constant('five', 5),
    op('add', '+', ['S', 'five']),
  ];
  const edges = [edge('S', 'add'), edge('five', 'add'), edge('add', 'M')];
  const variables = [
    variable('h', 'ACTUAL', { '09-2024': 100, '10-2024': 200, '11-2024': 300, '12-2024': 400 }),
  ];
  const result = run(nodes, edges, { variables, actual: ACTUAL, forecast: FORECAST });

  it('historical starts from the actual before the actual window', () => {
    expect(series(result, 'M', 'historical')).toMatchObject({ '10-2024': 105, '11-2024': 110, '12-2024': 115 });
  });

  it('forecast starts from the actual before the forecast window', () => {
    expect(series(result, 'M', 'forecast')).toMatchObject({ '01-2025': 405, '02-2025': 410, '03-2025': 415 });
  });

  it('budget runs through actual and forecast windows as one series', () => {
    expect(series(result, 'M', 'budget')).toEqual({
      '10-2024': 105,
      '11-2024': 110,
      '12-2024': 115,
      '01-2025': 120,
      '02-2025': 125,
      '03-2025': 130,
    });
  });
});

describe('shared nodes (old defect 3)', () => {
  const variables = [
    variable('v', 'INPUT', { '12-2024': 5, '01-2025': 10, '02-2025': 20, '03-2025': 30 }),
  ];

  it('diamond: M = X*2 + (X+1)', () => {
    const nodes = [
      data('X', 'v'),
      constant('two', 2),
      constant('one', 1),
      op('A', '*', ['X', 'two']),
      op('B', '+', ['X', 'one']),
      op('sum', '+', ['A', 'B']),
      metric('M'),
    ];
    const edges = [
      edge('X', 'A'),
      edge('two', 'A'),
      edge('X', 'B'),
      edge('one', 'B'),
      edge('A', 'sum'),
      edge('B', 'sum'),
      edge('sum', 'M'),
    ];
    const opts = { variables, actual: ACTUAL, forecast: FORECAST, types: ['forecast' as const] };
    const expected = { '01-2025': 31, '02-2025': 61, '03-2025': 91 };
    expect(series(run(nodes, edges, opts), 'M', 'forecast')).toMatchObject(expected);
    expect(series(run([...nodes].reverse(), [...edges].reverse(), opts), 'M', 'forecast')).toMatchObject(expected);
  });

  it('M = X + offset(X, 1) does not depend on edge order', () => {
    const nodes = [data('X', 'v'), offset('off', 'X', 1), op('sum', '+', ['X', 'off']), metric('M')];
    const edges = [edge('X', 'sum'), edge('X', 'off'), edge('off', 'sum'), edge('sum', 'M')];
    const opts = { variables, actual: ACTUAL, forecast: FORECAST, types: ['forecast' as const] };
    const expected = { '01-2025': 15, '02-2025': 30, '03-2025': 50 };
    expect(series(run(nodes, edges, opts), 'M', 'forecast')).toMatchObject(expected);
    expect(series(run(nodes, [...edges].reverse(), opts), 'M', 'forecast')).toMatchObject(expected);
    expect(series(run([...nodes].reverse(), edges, opts), 'M', 'forecast')).toMatchObject(expected);
  });

  it('offset over a metric reads its actual before the window and its forecast inside', () => {
    // M = offset(M, 2) + 1: a two-month recurrence grounded in actuals.
    const nodes = [metric('M', { historicalVariableId: 'h' }), offset('off', 'M', 2), constant('one', 1), op('add', '+', ['off', 'one'])];
    const edges = [edge('M', 'off'), edge('off', 'add'), edge('one', 'add'), edge('add', 'M')];
    const h = variable('h', 'ACTUAL', { '11-2024': 50, '12-2024': 70 });
    const result = run(nodes, edges, { variables: [h], actual: ACTUAL, forecast: FORECAST, types: ['forecast'] });
    expect(series(result, 'M', 'forecast')).toMatchObject({ '01-2025': 51, '02-2025': 71, '03-2025': 52 });
  });
});

describe('gap between the actual and forecast windows', () => {
  const nodes = [
    metric('M', { useCalculated: true, historicalVariableId: 'h' }),
    seed('S', 'M'),
    constant('one', 1),
    op('add', '+', ['S', 'one']),
  ];
  const edges = [edge('S', 'add'), edge('one', 'add'), edge('add', 'M')];
  const opts = { actual: ['01-2025', '03-2025'] as [string, string], forecast: ['06-2025', '08-2025'] as [string, string] };

  it('returns rows for both windows only and seeds the forecast from the month before it', () => {
    const variables = [variable('h', 'ACTUAL', { '12-2024': 100, '05-2025': 500 })];
    const result = run(nodes, edges, { ...opts, variables });
    expect(result.months.map(formatMonth)).toEqual(['01-2025', '02-2025', '03-2025', '06-2025', '07-2025', '08-2025']);
    expect(series(result, 'M', 'historical')).toMatchObject({ '01-2025': 101, '02-2025': 102, '03-2025': 103 });
    expect(series(result, 'M', 'forecast')).toMatchObject({ '06-2025': 501, '07-2025': 502, '08-2025': 503 });
    // Budget is one series over January..August; April and May are computed but not returned.
    expect(series(result, 'M', 'budget')).toEqual({
      '01-2025': 101,
      '02-2025': 102,
      '03-2025': 103,
      '06-2025': 106,
      '07-2025': 107,
      '08-2025': 108,
    });
  });

  it('a missing actual right before the forecast window makes the forecast null', () => {
    const variables = [variable('h', 'ACTUAL', { '12-2024': 100, '03-2025': 300 })];
    const result = run(nodes, edges, { ...opts, variables, types: ['forecast'] });
    expect(series(result, 'M', 'forecast')).toMatchObject({ '06-2025': null, '07-2025': null, '08-2025': null });
  });
});

describe('missing data', () => {
  const build = (extra: Record<string, unknown> = {}, variableId = 'v') => ({
    nodes: [data('X', variableId, 0, extra), constant('ten', 10), op('add', '+', ['X', 'ten']), metric('M')],
    edges: [edge('X', 'add'), edge('ten', 'add'), edge('add', 'M')],
  });
  const inputVar = variable('v', 'INPUT', { '01-2025': 1, '03-2025': null });
  const opts = { actual: ACTUAL, forecast: FORECAST, types: ['forecast' as const] };

  it('propagates null by default (no silent 0)', () => {
    const { nodes, edges } = build();
    const result = run(nodes, edges, { ...opts, variables: [inputVar] });
    expect(series(result, 'M', 'forecast')).toMatchObject({ '01-2025': 11, '02-2025': null, '03-2025': null });
  });

  it('reads a missing point as 0 when the DATA node says missingAsZero', () => {
    const { nodes, edges } = build({ missingAsZero: true });
    const result = run(nodes, edges, { ...opts, variables: [inputVar] });
    expect(series(result, 'M', 'forecast')).toMatchObject({ '01-2025': 11, '02-2025': 10, '03-2025': 10 });
  });

  it('missingAsZero does not apply when the variable type does not apply to the calc type', () => {
    const { nodes, edges } = build({ missingAsZero: true });
    const actualVar = variable('v', 'ACTUAL', { '01-2025': 1 });
    const result = run(nodes, edges, { ...opts, variables: [actualVar] });
    expect(series(result, 'M', 'forecast')).toMatchObject({ '01-2025': null, '02-2025': null, '03-2025': null });
  });

  it('a variable that is not loaded gives null and a warning', () => {
    const { nodes, edges } = build({}, 'nope');
    const result = run(nodes, edges, { ...opts, variables: [inputVar] });
    expect(series(result, 'M', 'forecast')['01-2025']).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'VARIABLE_NOT_FOUND', nodeIds: ['X'] })])
    );
  });
});

describe('DATA offset', () => {
  const v = variable('v', 'UNKNOWN', { '12-2024': 1, '01-2025': 2, '02-2025': 3, '03-2025': 4, '04-2025': 5 });
  const at = (offsetMonths: number) => {
    const result = run([data('X', 'v', offsetMonths), metric('M')], [edge('X', 'M')], {
      variables: [v],
      actual: ACTUAL,
      forecast: FORECAST,
      types: ['forecast'],
    });
    return series(result, 'X', 'forecast');
  };

  it('stored offsetMonths is a lead: +1 reads next month', () => {
    expect(at(1)).toMatchObject({ '01-2025': 3, '02-2025': 4, '03-2025': 5 });
  });

  it('-1 reads last month', () => {
    expect(at(-1)).toMatchObject({ '01-2025': 1, '02-2025': 2, '03-2025': 3 });
  });
});

describe('operators', () => {
  const value = (operator: string, inputs: Array<[string, number]>, inputOrder?: string[], edgeOrder?: string[]) => {
    const nodes: ClientNode[] = [...inputs.map(([id, v]) => constant(id, v)), op('o', operator, inputOrder), metric('M')];
    const sources = edgeOrder ?? inputs.map(([id]) => id);
    const edges: ClientEdge[] = [...sources.map((id) => edge(id, 'o')), edge('o', 'M')];
    const result = calculate(input(nodes, edges, { actual: ACTUAL, forecast: FORECAST, types: ['forecast'] }));
    if (!result.ok) {
      throw new Error(JSON.stringify(result.errors));
    }
    return { value: series(result, 'o', 'forecast')['01-2025'], warnings: result.warnings };
  };

  it('subtracts in inputOrder, whatever the edge order', () => {
    expect(value('-', [['a', 10], ['b', 3]], ['a', 'b'], ['b', 'a']).value).toBe(7);
    expect(value('-', [['a', 10], ['b', 3]], ['b', 'a'], ['a', 'b']).value).toBe(-7);
  });

  it('orders inputs missing from inputOrder by source id and warns', () => {
    const { value: v, warnings } = value('-', [['b', 3], ['a', 10]], [], ['b', 'a']);
    expect(v).toBe(7);
    expect(warnings.map((w) => w.code)).toContain('INPUT_ORDER_INCOMPLETE');
  });

  it('keeps the old arithmetic', () => {
    expect(value('+', [['a', 1], ['b', 2], ['c', 3]], ['a', 'b', 'c']).value).toBe(6);
    expect(value('*', [['a', 2], ['b', 3], ['c', 4]], ['a', 'b', 'c']).value).toBe(24);
    expect(value('-', [['a', 4]], ['a']).value).toBe(-4);
    expect(value('/', [['a', 4]], ['a']).value).toBe(0.25);
    expect(value('/', [['a', 12], ['b', 3], ['c', 2]], ['a', 'b', 'c']).value).toBe(2);
    expect(value('^', [['a', 2], ['b', 10]], ['a', 'b']).value).toBe(1024);
  });

  it('division by zero and non-finite results are null', () => {
    expect(value('/', [['a', 1], ['b', 0]], ['a', 'b']).value).toBeNull();
    expect(value('/', [['a', 0]], ['a']).value).toBeNull();
    expect(value('^', [['a', -8], ['b', 0.5]], ['a', 'b']).value).toBeNull();
  });
});

describe('scenarios ported from the old engine tests', () => {
  const months = { actual: ['11-2024', '12-2024'] as [string, string], forecast: ['01-2025', '02-2025'] as [string, string] };

  it('constant -> metric in all calc types; calculated mirrors non-METRIC values', () => {
    const result = run([constant('c', 100000), metric('m')], [edge('c', 'm')], months);
    const c = result.nodes.find((n) => n.nodeId === 'c')!;
    const jan = c.values.find((v) => formatMonth(v.month) === '01-2025')!;
    const dec = c.values.find((v) => formatMonth(v.month) === '12-2024')!;
    expect(jan).toMatchObject({ forecast: 100000, budget: 100000, historical: null, calculated: 100000 });
    expect(dec).toMatchObject({ historical: 100000, forecast: null, budget: 100000, calculated: 100000 });
    const m = result.nodes.find((n) => n.nodeId === 'm')!;
    expect(m.values.every((v) => v.calculated === null)).toBe(true);
    expect(result.nodes).toHaveLength(2);
  });

  it('operator + over two constants', () => {
    const result = run(
      [constant('c1', 100000), constant('c2', 50000), op('o', '+', ['c1', 'c2']), metric('m')],
      [edge('c1', 'o'), edge('c2', 'o'), edge('o', 'm')],
      { ...months, types: ['forecast'] }
    );
    expect(series(result, 'o', 'forecast')['01-2025']).toBe(150000);
  });

  it('constant chain 1000 * 1.1', () => {
    const result = run(
      [constant('c1', 1000), constant('c2', 1.1), op('o', '*', ['c1', 'c2']), metric('m')],
      [edge('c1', 'o'), edge('c2', 'o'), edge('o', 'm')],
      { ...months, types: ['forecast'] }
    );
    expect(series(result, 'm', 'forecast')['01-2025']).toBeCloseTo(1100, 9);
  });

  it('50 constants summed through 26 operators', () => {
    const nodes: ClientNode[] = [];
    const edges: ClientEdge[] = [];
    for (let i = 0; i < 50; i++) {
      nodes.push(constant(`c${i}`, i + 1));
    }
    for (let i = 0; i < 25; i++) {
      nodes.push(op(`o${i}`, '+', [`c${2 * i}`, `c${2 * i + 1}`]));
      edges.push(edge(`c${2 * i}`, `o${i}`), edge(`c${2 * i + 1}`, `o${i}`), edge(`o${i}`, 'final'));
    }
    nodes.push(op('final', '+', Array.from({ length: 25 }, (_, i) => `o${i}`)), metric('m'));
    edges.push(edge('final', 'm'));
    const result = run(nodes, edges, { ...months, types: ['forecast'] });
    expect(series(result, 'm', 'forecast')['01-2025']).toBe(1275);
  });

  describe('unified calculation (old calculation-engine-unified.spec)', () => {
    const variables = [
      variable('var-budget', 'BUDGET', { '02-2025': 950, '03-2025': 1150, '04-2025': 1050 }),
      variable('var-historical', 'ACTUAL', { '11-2024': 800, '12-2024': 900, '01-2025': 950 }),
    ];
    const tree = (useCalculated: boolean) => ({
      nodes: [
        constant('const-1', 100),
        metric('metric-1', { useCalculated, budgetVariableId: 'var-budget', historicalVariableId: 'var-historical' }),
      ],
      edges: [edge('const-1', 'metric-1')],
    });
    const periods = { actual: ['11-2024', '01-2025'] as [string, string], forecast: ['02-2025', '04-2025'] as [string, string] };

    it('each calc type fills only its own window', () => {
      const { nodes, edges } = tree(true);
      const forecastOnly = run(nodes, edges, { ...periods, variables, types: ['forecast'] });
      expect(series(forecastOnly, 'metric-1', 'forecast')).toEqual({
        '11-2024': null,
        '12-2024': null,
        '01-2025': null,
        '02-2025': 100,
        '03-2025': 100,
        '04-2025': 100,
      });
      expect(Object.values(series(forecastOnly, 'metric-1', 'historical')).every((v) => v === null)).toBe(true);

      const historicalOnly = run(nodes, edges, { ...periods, variables, types: ['historical'] });
      expect(series(historicalOnly, 'metric-1', 'historical')).toMatchObject({ '11-2024': 100, '12-2024': 100, '01-2025': 100 });
      expect(series(historicalOnly, 'metric-1', 'historical')['02-2025']).toBeNull();

      // Budget covers both windows (the old core did too; the older unified engine used the forecast window only).
      const budgetOnly = run(nodes, edges, { ...periods, variables, types: ['budget'] });
      expect(Object.values(series(budgetOnly, 'metric-1', 'budget'))).toEqual([100, 100, 100, 100, 100, 100]);
    });

    it('overlapping windows give both values in the shared month', () => {
      const { nodes, edges } = tree(true);
      const result = run(nodes, edges, {
        actual: ['12-2024', '01-2025'],
        forecast: ['01-2025', '03-2025'],
        variables,
        types: ['historical', 'forecast'],
      });
      expect(result.months.map(formatMonth)).toEqual(['12-2024', '01-2025', '02-2025', '03-2025']);
      expect(series(result, 'metric-1', 'historical')).toEqual({ '12-2024': 100, '01-2025': 100, '02-2025': null, '03-2025': null });
      expect(series(result, 'metric-1', 'forecast')).toEqual({ '12-2024': null, '01-2025': 100, '02-2025': 100, '03-2025': 100 });
    });

    it('no calc types: every value is null', () => {
      const { nodes, edges } = tree(true);
      const result = run(nodes, edges, { ...periods, variables, types: [] });
      expect(result.nodes.every((n) => n.values.every((v) => v.historical === null && v.forecast === null && v.budget === null && v.calculated === null))).toBe(true);
    });

    it('forecast is always calculated, even with useCalculated = false', () => {
      const { nodes, edges } = tree(false);
      const result = run(nodes, edges, { ...periods, variables });
      expect(series(result, 'metric-1', 'forecast')).toMatchObject({ '02-2025': 100, '03-2025': 100, '04-2025': 100 });
      expect(series(result, 'metric-1', 'historical')).toMatchObject({ '11-2024': 800, '12-2024': 900, '01-2025': 950 });
      expect(series(result, 'metric-1', 'budget')).toEqual({
        '11-2024': null,
        '12-2024': null,
        '01-2025': null,
        '02-2025': 950,
        '03-2025': 1150,
        '04-2025': 1050,
      });
    });

    it('a metric without an input reads its variables and warns', () => {
      const result = run(
        [metric('metric-h', { useCalculated: false, budgetVariableId: 'var-budget', historicalVariableId: 'var-historical' })],
        [],
        { ...periods, variables }
      );
      expect(series(result, 'metric-h', 'historical')).toMatchObject({ '11-2024': 800, '12-2024': 900, '01-2025': 950 });
      expect(Object.values(series(result, 'metric-h', 'forecast')).every((v) => v === null)).toBe(true);
      expect(result.warnings.map((w) => w.code)).toContain('METRIC_WITHOUT_INPUT');
    });

    it('SEED of another metric: last actual first, then that metric\'s forecast', () => {
      const { nodes, edges } = tree(true);
      const result = run(
        [...nodes, seed('seed-1', 'metric-1'), metric('metric-2', { historicalVariableId: 'var-historical' })],
        [...edges, edge('seed-1', 'metric-2')],
        { ...periods, variables, types: ['forecast'] }
      );
      expect(series(result, 'metric-2', 'forecast')).toMatchObject({ '02-2025': 950, '03-2025': 100, '04-2025': 100 });
    });
  });
});

describe('trace', () => {
  it('is returned as a value, one step per evaluated node, month and type', () => {
    const nodes = [metric('M', { historicalVariableId: 'h' }), seed('S', 'M'), constant('one', 1), op('add', '+', ['S', 'one'])];
    const edges = [edge('S', 'add'), edge('one', 'add'), edge('add', 'M')];
    const result = run(nodes, edges, {
      variables: [variable('h', 'ACTUAL', { '12-2024': 7 })],
      actual: ACTUAL,
      forecast: FORECAST,
      types: ['forecast'],
      trace: true,
    });
    const steps = result.trace!;
    const window = steps.filter((s) => s.phase === 'window');
    expect(window).toHaveLength(4 * 3);
    const firstSeed = steps.find((s) => s.nodeId === 'S' && s.phase === 'window')!;
    expect(firstSeed).toMatchObject({ month: firstSeed.month, value: 7, inputs: [{ nodeId: 'M', lag: 1, value: 7 }] });
    expect(steps.find((s) => s.nodeId === 'M' && s.phase === 'past')).toMatchObject({ value: 7, variableId: 'h' });
    expect(run(nodes, edges, { actual: ACTUAL, forecast: FORECAST }).trace).toBeUndefined();
  });
});
