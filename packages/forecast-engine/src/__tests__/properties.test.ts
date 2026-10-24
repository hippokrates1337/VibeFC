/**
 * Property tests over seeded random graphs (support/random-graph.ts):
 * - the engine agrees with the naive reference evaluator;
 * - results do not depend on node or edge array order (old defect 3);
 * - a same-month back edge is always reported as a CYCLE with a real path.
 * Set FORECAST_ENGINE_PROPERTY_RUNS to run more cases locally.
 */
import { calculate } from '../calculate';
import { formatMonth } from '../months';
import { validateGraph } from '../graph';
import type { CalculateInput, CalculateSuccess } from '../types';
import { generateCase, permute, random } from './support/random-graph';
import { referenceCalculate } from './support/reference';

const RUNS = Number(process.env.FORECAST_ENGINE_PROPERTY_RUNS ?? 300);

function mustCalculate(testCase: CalculateInput): CalculateSuccess {
  const result = calculate(testCase);
  if (!result.ok) {
    throw new Error(`generated graph refused: ${JSON.stringify({ errors: result.errors, testCase }, null, 2)}`);
  }
  return result;
}

function byNode(result: CalculateSuccess) {
  const out: Record<string, Record<string, unknown>> = {};
  for (const node of result.nodes) {
    out[node.nodeId] = {};
    for (const v of node.values) {
      out[node.nodeId][formatMonth(v.month)] = {
        historical: v.historical,
        forecast: v.forecast,
        budget: v.budget,
        calculated: v.calculated,
      };
    }
  }
  return out;
}

describe('random graphs', () => {
  it('are valid by construction', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const testCase = generateCase(seed);
      const validation = validateGraph(testCase.nodes, testCase.edges);
      expect({ seed, errors: validation.errors }).toEqual({ seed, errors: [] });
    }
  });

  it('match the reference evaluator', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const testCase = generateCase(seed);
      const engine = byNode(mustCalculate(testCase));
      const reference = referenceCalculate(testCase);
      const expected: Record<string, Record<string, unknown>> = {};
      for (const nodeId of Object.keys(reference)) {
        expected[nodeId] = {};
        for (const month of Object.keys(reference[nodeId])) {
          expected[nodeId][formatMonth(Number(month))] = reference[nodeId][Number(month)];
        }
      }
      expect({ seed, values: engine }).toEqual({ seed, values: expected });
    }
  });

  it('do not depend on node or edge order', () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const testCase = generateCase(seed);
      const baseline = byNode(mustCalculate(testCase));
      for (let k = 1; k <= 3; k++) {
        const permuted = byNode(mustCalculate(permute(testCase, seed * 31 + k)));
        expect({ seed, k, values: permuted }).toEqual({ seed, k, values: baseline });
      }
    }
  });

  it('report a same-month back edge between operators as a cycle with a real path', () => {
    let checked = 0;
    for (let seed = 1; seed <= RUNS; seed++) {
      const testCase = generateCase(seed);
      const r = random(seed);
      // Find an operator path a -> ... -> b over lag-0 edges, then add b -> a.
      const operators = testCase.nodes.filter((n) => n.type === 'OPERATOR' && (n.data as any).op !== 'offset').map((n) => n.id);
      const sameMonth = testCase.edges.filter((e) => operators.includes(e.target));
      if (sameMonth.length === 0) continue;
      const e = r.pick(sameMonth);
      const back = { id: 'back-edge', source: e.target, target: e.source };
      const sourceNode = testCase.nodes.find((n) => n.id === e.source)!;
      if (sourceNode.type !== 'OPERATOR' || (sourceNode.data as any).op === 'offset') continue;
      const validation = validateGraph(testCase.nodes, [...testCase.edges, back]);
      const cycle = validation.errors.find((x) => x.code === 'CYCLE');
      expect({ seed, found: Boolean(cycle) }).toEqual({ seed, found: true });
      const path = cycle!.path!;
      expect(path[0]).toBe(path[path.length - 1]);
      for (let i = 0; i + 1 < path.length; i++) {
        const linked = [...testCase.edges, back].some((x) => x.source === path[i] && x.target === path[i + 1]);
        expect({ seed, step: [path[i], path[i + 1]], linked }).toEqual({ seed, step: [path[i], path[i + 1]], linked: true });
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(RUNS / 50);
  });
});
