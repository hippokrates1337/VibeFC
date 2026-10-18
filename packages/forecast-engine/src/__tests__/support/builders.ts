import { calculate } from '../../calculate';
import { formatMonth, parseMonth } from '../../months';
import type {
  CalcType,
  CalculateInput,
  CalculateSuccess,
  ClientEdge,
  ClientNode,
  EngineVariable,
  VariableType,
} from '../../types';

export const constant = (id: string, value: number): ClientNode => ({
  id,
  type: 'CONSTANT',
  data: { name: id, value },
});

export const data = (
  id: string,
  variableId: string,
  offsetMonths = 0,
  extra: Record<string, unknown> = {}
): ClientNode => ({ id, type: 'DATA', data: { name: id, variableId, offsetMonths, ...extra } });

export const op = (
  id: string,
  operator: string,
  inputOrder?: string[],
  offsetMonths?: number
): ClientNode => ({
  id,
  type: 'OPERATOR',
  data: { op: operator, inputOrder: inputOrder ?? [], ...(offsetMonths === undefined ? {} : { offsetMonths }) },
});

export const offset = (id: string, input: string, months: number): ClientNode =>
  op(id, 'offset', [input], months);

export const metric = (
  id: string,
  attrs: { useCalculated?: boolean; historicalVariableId?: string; budgetVariableId?: string } = {}
): ClientNode => ({
  id,
  type: 'METRIC',
  data: {
    label: id,
    useCalculated: attrs.useCalculated ?? true,
    historicalVariableId: attrs.historicalVariableId ?? '',
    budgetVariableId: attrs.budgetVariableId ?? '',
  },
});

export const seed = (id: string, sourceMetricId: string): ClientNode => ({
  id,
  type: 'SEED',
  data: { sourceMetricId },
});

export const edge = (source: string, target: string, id = `${source}->${target}`): ClientEdge => ({
  id,
  source,
  target,
});

/** `variable('v', 'ACTUAL', {'12-2024': 100, '01-2025': null})` */
export const variable = (
  id: string,
  type: VariableType,
  values: Record<string, number | null>
): EngineVariable => ({
  id,
  type,
  values: Object.keys(values).map((month) => ({ month: parseMonth(month), value: values[month] })),
});

export interface RunOptions {
  variables?: EngineVariable[];
  actual: [string, string];
  forecast: [string, string];
  types?: CalcType[];
  trace?: boolean;
}

export function input(nodes: ClientNode[], edges: ClientEdge[], opts: RunOptions): CalculateInput {
  return {
    nodes,
    edges,
    variables: opts.variables ?? [],
    windows: {
      actual: { start: parseMonth(opts.actual[0]), end: parseMonth(opts.actual[1]) },
      forecast: { start: parseMonth(opts.forecast[0]), end: parseMonth(opts.forecast[1]) },
    },
    calculationTypes: opts.types ?? ['historical', 'forecast', 'budget'],
    trace: opts.trace,
  };
}

/** Calculates and fails the test with the issues when the engine refuses. */
export function run(nodes: ClientNode[], edges: ClientEdge[], opts: RunOptions): CalculateSuccess {
  const result = calculate(input(nodes, edges, opts));
  if (!result.ok) {
    throw new Error(`calculation refused: ${JSON.stringify(result.errors, null, 2)}`);
  }
  return result;
}

/** `{ '01-2025': 110, ... }` for one node and calc type, only months where the type applies. */
export function series(
  result: CalculateSuccess,
  nodeId: string,
  type: CalcType
): Record<string, number | null> {
  const node = result.nodes.find((n) => n.nodeId === nodeId);
  if (!node) {
    throw new Error(`no result for node ${nodeId}`);
  }
  const out: Record<string, number | null> = {};
  for (const value of node.values) {
    out[formatMonth(value.month)] = value[type];
  }
  return out;
}

/** Rounds every number to 10 significant decimals so float noise does not fail equality. */
export function rounded<T extends Record<string, number | null>>(values: T): T {
  const out: Record<string, number | null> = {};
  for (const key of Object.keys(values)) {
    const v = values[key];
    out[key] = v === null ? null : Math.round(v * 1e10) / 1e10;
  }
  return out as T;
}
