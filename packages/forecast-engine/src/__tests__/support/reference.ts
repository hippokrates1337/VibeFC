/**
 * A naive reference evaluator written straight from docs/forecast-engine.md, sharing no
 * code with the engine: it reads the client graph directly and evaluates
 * v(node, month, type) by recursion with a memo. Slow, but obviously correct for the
 * small graphs the property tests generate. Assumes the graph is valid.
 */
import type { CalcType, CalculateInput, ClientEdge, ClientNode } from '../../types';

export type ReferenceResult = Record<string, Record<number, { historical: number | null; forecast: number | null; budget: number | null; calculated: number | null }>>;

type Attrs = Record<string, any>;

export function referenceCalculate(input: CalculateInput): ReferenceResult {
  const nodes = new Map<string, ClientNode>(input.nodes.map((n) => [n.id, n]));
  const attrs = (id: string): Attrs => (nodes.get(id)!.data ?? {}) as Attrs;
  const incoming = (id: string): ClientEdge[] => input.edges.filter((e) => e.target === id);

  const variables = new Map<string, { type: string; values: Map<number, number | null> }>();
  for (const v of input.variables) {
    const values = new Map<number, number | null>();
    for (const p of v.values) values.set(p.month, p.value);
    variables.set(v.id, { type: v.type, values });
  }
  const read = (variableId: string | undefined, month: number): number | null => {
    const v = variableId ? variables.get(variableId) : undefined;
    if (!v) return null;
    const value = v.values.get(month);
    return value === undefined ? null : value;
  };

  const { actual, forecast } = input.windows;
  const range = (type: CalcType) =>
    type === 'historical'
      ? actual
      : type === 'forecast'
        ? forecast
        : { start: Math.min(actual.start, forecast.start), end: Math.max(actual.end, forecast.end) };
  const inWindow = (type: CalcType, month: number) => {
    const inActual = month >= actual.start && month <= actual.end;
    const inForecast = month >= forecast.start && month <= forecast.end;
    return type === 'historical' ? inActual : type === 'forecast' ? inForecast : inActual || inForecast;
  };

  /** [sourceId, lag][] in operand order */
  const inputsOf = (id: string): Array<[string, number]> => {
    const node = nodes.get(id)!;
    const a = attrs(id);
    const edges = incoming(id);
    switch (node.type) {
      case 'SEED':
        return [[a.sourceMetricId || edges[0].source, 1]];
      case 'OPERATOR': {
        if (a.op === 'offset') return [[edges[0].source, a.offsetMonths]];
        const order: string[] = Array.isArray(a.inputOrder) ? a.inputOrder : [];
        const position = (e: ClientEdge) => (order.indexOf(e.source) >= 0 ? order.indexOf(e.source) : Infinity);
        const sorted = [...edges].sort((x, y) => {
          if (position(x) !== position(y)) return position(x) < position(y) ? -1 : 1;
          const rx = x.rank ?? Infinity;
          const ry = y.rank ?? Infinity;
          if (rx !== ry) return rx < ry ? -1 : 1;
          if (x.source !== y.source) return x.source < y.source ? -1 : 1;
          return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
        });
        return sorted.map((e) => [e.source, 0]);
      }
      case 'METRIC':
        return edges.map((e) => [e.source, 0]);
      default:
        return [];
    }
  };

  const finite = (x: number): number | null => (Number.isFinite(x) ? x : null);
  const arithmetic = (operator: string, xs: number[]): number | null => {
    switch (operator) {
      case '+': {
        let s = 0;
        for (const x of xs) s = s + x;
        return finite(s);
      }
      case '*': {
        let p = 1;
        for (const x of xs) p = p * x;
        return finite(p);
      }
      case '-': {
        if (xs.length === 1) return finite(-xs[0]);
        let d = xs[0];
        for (let i = 1; i < xs.length; i++) d = d - xs[i];
        return finite(d);
      }
      case '/': {
        if (xs.length === 1) return xs[0] === 0 ? null : finite(1 / xs[0]);
        let q = xs[0];
        for (let i = 1; i < xs.length; i++) {
          if (xs[i] === 0) return null;
          q = q / xs[i];
        }
        return finite(q);
      }
      case '^':
        return finite(Math.pow(xs[0], xs[1]));
      default:
        throw new Error(`unknown operator ${operator}`);
    }
  };

  const applies = (variableType: string, type: CalcType) =>
    type === 'historical'
      ? variableType === 'ACTUAL' || variableType === 'UNKNOWN'
      : type === 'forecast'
        ? variableType === 'INPUT' || variableType === 'UNKNOWN'
        : variableType === 'BUDGET';

  const memo = new Map<string, number | null>();
  const value = (id: string, month: number, type: CalcType): number | null => {
    const key = `${type}|${month}|${id}`;
    if (memo.has(key)) return memo.get(key)!;
    const node = nodes.get(id)!;
    const a = attrs(id);
    const past = month < range(type).start;
    let result: number | null;
    const fromInputs = () => inputsOf(id).map(([source, lag]) => value(source, month - lag, type));
    switch (node.type) {
      case 'CONSTANT':
        result = a.value;
        break;
      case 'DATA': {
        const v = a.variableId ? variables.get(a.variableId) : undefined;
        if (!v || !applies(v.type, type)) {
          result = null;
        } else {
          const raw = read(a.variableId, month + (a.offsetMonths ?? 0));
          result = raw === null && a.missingAsZero === true ? 0 : raw;
        }
        break;
      }
      case 'SEED':
        result = fromInputs()[0];
        break;
      case 'OPERATOR': {
        const xs = fromInputs();
        result = a.op === 'offset' ? xs[0] : xs.some((x) => x === null) ? null : arithmetic(a.op, xs as number[]);
        break;
      }
      case 'METRIC': {
        if (past) {
          result = read(a.historicalVariableId, month);
        } else if (type === 'forecast' || a.useCalculated) {
          const xs = fromInputs();
          result = xs.length === 0 ? null : xs[0];
        } else {
          result = read(type === 'historical' ? a.historicalVariableId : a.budgetVariableId, month);
        }
        break;
      }
      default:
        throw new Error(`unknown node type ${node.type}`);
    }
    memo.set(key, result);
    return result;
  };

  const months = new Set<number>();
  for (let m = actual.start; m <= actual.end; m++) months.add(m);
  for (let m = forecast.start; m <= forecast.end; m++) months.add(m);

  const out: ReferenceResult = {};
  for (const node of input.nodes) {
    out[node.id] = {};
    for (const month of months) {
      const row = { historical: null as number | null, forecast: null as number | null, budget: null as number | null, calculated: null as number | null };
      for (const type of input.calculationTypes) {
        if (inWindow(type, month)) row[type] = value(node.id, month, type);
      }
      row.calculated = node.type === 'METRIC' ? null : row.forecast ?? row.historical ?? row.budget;
      out[node.id][month] = row;
    }
  }
  return out;
}
