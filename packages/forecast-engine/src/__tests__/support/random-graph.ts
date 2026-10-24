/**
 * Seeded random forecast graphs for property tests (fast-check is not installed; this is
 * a small deterministic stand-in). Every generated graph is valid by construction:
 * - same-month edges only go from a lower to a higher node position (a DAG);
 * - lag edges (SEED, offset with lag >= 1) may point anywhere, but an offset that points
 *   "backwards" always reads a METRIC, so every recurrence passes through a metric.
 */
import type { CalculateInput, ClientEdge, ClientNode, EngineVariable, Window } from '../../types';

/** mulberry32 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Random {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
}

export function random(seed: number): Random {
  const next = rng(seed);
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)],
    chance: (p) => next() < p,
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

const BASE = 2024 * 12; // January 2024
const VARIABLE_TYPES = ['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN'] as const;

export interface GenerateOptions {
  /**
   * Only graphs the old tree engine accepted (used by the backend parity run): every
   * metric has exactly one input, SEEDs name their metric, no Metric -> SEED edges, and
   * the actual window ends before the forecast window starts, both at least 2 months long.
   */
  readonly legacyCompatible?: boolean;
}

export function generateCase(seed: number, options: GenerateOptions = {}): CalculateInput {
  const r = random(seed);
  const legacy = options.legacyCompatible === true;

  const variables: EngineVariable[] = [];
  const variableCount = r.int(1, 4);
  for (let i = 0; i < variableCount; i++) {
    const values = [];
    for (let m = BASE - 6; m < BASE + 30; m++) {
      if (r.chance(0.15)) continue; // missing point
      values.push({ month: m, value: r.chance(0.05) ? null : r.int(-3, 12) });
    }
    variables.push({ id: `v${i}`, type: r.pick(VARIABLE_TYPES), values });
  }
  const variableIds = variables.map((v) => v.id);

  const nodes: ClientNode[] = [];
  const edges: ClientEdge[] = [];
  const metrics: string[] = [];
  const pendingSeeds: string[] = [];
  const nodeCount = r.int(2, 9);
  let edgeCounter = 0;
  const addEdge = (source: string, target: string) => {
    edges.push({ id: `e${edgeCounter++}`, source, target });
  };

  for (let i = 0; i < nodeCount; i++) {
    const id = `n${i}`;
    const earlier = nodes.map((n) => n.id);
    const kinds: string[] = ['CONSTANT', 'DATA', 'METRIC', 'SEED'];
    if (earlier.length > 0) kinds.push('OPERATOR', 'OPERATOR', 'OFFSET', 'METRIC');
    let kind = i === nodeCount - 1 && metrics.length === 0 ? 'METRIC' : r.pick(kinds);
    if (legacy && kind === 'METRIC' && earlier.length === 0) kind = 'CONSTANT';
    if (legacy && i === nodeCount - 1 && metrics.length === 0 && earlier.length === 0) {
      nodes.push({ id: `${id}c`, type: 'CONSTANT', data: { name: `${id}c`, value: r.int(-2, 5) } });
      earlier.push(`${id}c`);
      kind = 'METRIC';
    }

    switch (kind) {
      case 'CONSTANT':
        nodes.push({ id, type: 'CONSTANT', data: { name: id, value: r.int(-2, 5) } });
        break;
      case 'DATA':
        nodes.push({
          id,
          type: 'DATA',
          data: {
            name: id,
            variableId: r.pick(variableIds),
            offsetMonths: r.int(-2, 2),
            ...(r.chance(0.3) ? { missingAsZero: true } : {}),
          },
        });
        break;
      case 'SEED':
        nodes.push({ id, type: 'SEED', data: { sourceMetricId: '' } });
        pendingSeeds.push(id);
        break;
      case 'METRIC': {
        nodes.push({
          id,
          type: 'METRIC',
          data: {
            label: id,
            useCalculated: r.chance(0.5),
            historicalVariableId: r.chance(0.8) ? r.pick(variableIds) : '',
            budgetVariableId: r.chance(0.6) ? r.pick(variableIds) : '',
          },
        });
        metrics.push(id);
        if (earlier.length > 0 && (legacy || r.chance(0.85))) addEdge(r.pick(earlier), id);
        break;
      }
      case 'OFFSET': {
        // Either a lower node at lag 0..3, or any metric so far at lag >= 1 (possibly a recurrence later).
        const source = earlier.length > 0 && (legacy || r.chance(0.6)) ? r.pick(earlier) : null;
        nodes.push({ id, type: 'OPERATOR', data: { op: 'offset', offsetMonths: r.int(source ? 0 : 1, 3), inputOrder: [] } });
        if (source) {
          addEdge(source, id);
          if (legacy) (nodes[nodes.length - 1].data as Record<string, unknown>).inputOrder = [source]; // as the canvas keeps it
        } else {
          pendingSeeds.push(`offset:${id}`);
        }
        break;
      }
      case 'OPERATOR': {
        const operator = r.pick(['+', '-', '*', '/', '+', '*', '^']);
        const count = operator === '^' ? 2 : r.int(1, Math.min(3, earlier.length + 1));
        const inputs: string[] = [];
        for (let k = 0; k < count; k++) inputs.push(r.pick(earlier));
        nodes.push({ id, type: 'OPERATOR', data: { op: operator, inputOrder: [...new Set(inputs)] } });
        for (const source of inputs) addEdge(source, id);
        break;
      }
    }
  }

  // Resolve lag references now that all metrics exist (they may point "forward").
  for (const pending of pendingSeeds) {
    const metricId = r.pick(metrics);
    if (pending.startsWith('offset:')) {
      const offsetId = pending.slice('offset:'.length);
      const node = nodes.find((n) => n.id === offsetId)!;
      (node.data as Record<string, unknown>).offsetMonths = r.int(1, 3);
      addEdge(metricId, offsetId);
    } else {
      const node = nodes.find((n) => n.id === pending)!;
      if (legacy || r.chance(0.5)) {
        (node.data as Record<string, unknown>).sourceMetricId = metricId;
        if (!legacy && r.chance(0.3)) addEdge(metricId, pending); // canvas-style edge, same metric
      } else {
        addEdge(metricId, pending);
      }
    }
  }

  const actualStart = BASE + r.int(0, 6);
  let actual: Window = { start: actualStart, end: actualStart + r.int(0, 5) };
  if (legacy && actual.end === actual.start) actual = { start: actual.start, end: actual.start + 1 };
  const forecastStart = actual.end + (legacy ? r.int(1, 4) : r.int(-1, 4)); // overlap, adjacent or gap
  const forecast: Window = { start: forecastStart, end: forecastStart + (legacy ? r.int(1, 6) : r.int(0, 6)) };

  const types = r.shuffle(['historical', 'forecast', 'budget'] as const).slice(0, r.int(1, 3));
  return { nodes, edges, variables, windows: { actual, forecast }, calculationTypes: types };
}

/** Same graph, different array order of nodes and edges (and of `inputOrder`-free ties). */
export function permute(testCase: CalculateInput, seed: number): CalculateInput {
  const r = random(seed);
  return { ...testCase, nodes: r.shuffle(testCase.nodes), edges: r.shuffle(testCase.edges) };
}
