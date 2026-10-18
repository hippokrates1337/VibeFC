/**
 * Evaluation (docs/forecast-engine.md §4). For each calc type, month by month in
 * topological order, into a memo that lives only for this call. Values before a calc
 * type's range are base cases, computed on demand (§4 "The past").
 *
 * Compiled by the frontend too (ES5 target): no for-of over Map/Set.
 */
import { buildGraph } from './graph';
import type {
  CalcType,
  CalculateInput,
  CalculateResult,
  Graph,
  GraphNode,
  Input,
  Issue,
  MonthIndex,
  MonthValue,
  NodeResult,
  TraceInput,
  TraceStep,
  Window,
} from './types';
import { CALC_TYPES } from './types';

interface IndexedVariable {
  readonly type: string;
  readonly values: Map<MonthIndex, number | null>;
}

/** Which variable types a DATA node reads for each calc type (unchanged from the old engine). */
const APPLICABLE_VARIABLE_TYPES: Record<CalcType, readonly string[]> = {
  historical: ['ACTUAL', 'UNKNOWN'],
  forecast: ['INPUT', 'UNKNOWN'],
  budget: ['BUDGET'],
};

const finiteOrNull = (value: number): number | null => (Number.isFinite(value) ? value : null);

/** The old engine's `performOperation`, with non-finite results mapped to null. */
export function performOperation(op: string, values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  switch (op) {
    case '+': {
      let sum = 0;
      for (let i = 0; i < values.length; i++) sum = sum + values[i];
      return finiteOrNull(sum);
    }
    case '*': {
      let product = 1;
      for (let i = 0; i < values.length; i++) product = product * values[i];
      return finiteOrNull(product);
    }
    case '-': {
      if (values.length === 1) return finiteOrNull(-values[0]);
      let difference = values[0];
      for (let i = 1; i < values.length; i++) difference = difference - values[i];
      return finiteOrNull(difference);
    }
    case '/': {
      if (values.length === 1) return values[0] === 0 ? null : finiteOrNull(1 / values[0]);
      let quotient = values[0];
      for (let i = 1; i < values.length; i++) {
        if (values[i] === 0) return null;
        quotient = quotient / values[i];
      }
      return finiteOrNull(quotient);
    }
    case '^':
      return values.length === 2 ? finiteOrNull(Math.pow(values[0], values[1])) : null;
    default:
      return null;
  }
}

function windowIssues(windows: CalculateInput['windows']): Issue[] {
  const issues: Issue[] = [];
  const check = (name: string, w: Window | undefined) => {
    if (!w || !Number.isInteger(w.start) || !Number.isInteger(w.end) || w.start > w.end) {
      issues.push({
        code: 'INVALID_WINDOW',
        severity: 'error',
        message: `The ${name} period must have a start month on or before its end month.`,
        nodeIds: [],
      });
    }
  };
  check('actual', windows && windows.actual);
  check('forecast', windows && windows.forecast);
  return issues;
}

function inWindow(type: CalcType, month: MonthIndex, actual: Window, forecast: Window): boolean {
  const inActual = month >= actual.start && month <= actual.end;
  const inForecast = month >= forecast.start && month <= forecast.end;
  return type === 'historical' ? inActual : type === 'forecast' ? inForecast : inActual || inForecast;
}

function rangeOf(type: CalcType, actual: Window, forecast: Window): Window {
  if (type === 'historical') return actual;
  if (type === 'forecast') return forecast;
  return { start: Math.min(actual.start, forecast.start), end: Math.max(actual.end, forecast.end) };
}

class Evaluation {
  /** memo[month - range.start][node index] */
  private readonly memo: (number | null)[][] = [];
  private readonly past = new Map<string, number | null>();

  constructor(
    private readonly graph: Graph,
    private readonly type: CalcType,
    private readonly range: Window,
    private readonly variables: Map<string, IndexedVariable>,
    private readonly missingVariables: Map<string, string[]>,
    private readonly trace: TraceStep[] | null
  ) {}

  run(): void {
    const { order, nodes } = this.graph;
    for (let t = this.range.start; t <= this.range.end; t++) {
      const row: (number | null)[] = new Array(nodes.length).fill(null);
      this.memo.push(row);
      for (let i = 0; i < order.length; i++) {
        row[order[i]] = this.evaluate(order[i], t, 'window');
      }
    }
  }

  valueAt(node: number, month: MonthIndex): number | null {
    return this.memo[month - this.range.start][node];
  }

  private read(input: Input, t: MonthIndex, traceInputs: TraceInput[] | null): number | null {
    const month = t - input.lag;
    const value =
      month >= this.range.start ? this.memo[month - this.range.start][input.source] : this.pastValue(input.source, month);
    if (traceInputs) {
      traceInputs.push({ nodeId: this.graph.nodes[input.source].id, lag: input.lag, month, value });
    }
    return value;
  }

  /** Base case before the range: memoized, finite because every recurrence passes a METRIC. */
  private pastValue(node: number, month: MonthIndex): number | null {
    const key = `${node}:${month}`;
    if (this.past.has(key)) {
      return this.past.get(key)!;
    }
    const value = this.evaluate(node, month, 'past');
    this.past.set(key, value);
    return value;
  }

  private variableValue(variableId: string | null, month: MonthIndex, nodeId: string): number | null {
    if (!variableId) {
      return null;
    }
    const variable = this.variables.get(variableId);
    if (!variable) {
      this.noteMissingVariable(variableId, nodeId);
      return null;
    }
    const value = variable.values.get(month);
    return value === undefined ? null : value;
  }

  private noteMissingVariable(variableId: string, nodeId: string): void {
    const nodeIds = this.missingVariables.get(variableId);
    if (!nodeIds) {
      this.missingVariables.set(variableId, [nodeId]);
    } else if (nodeIds.indexOf(nodeId) < 0) {
      nodeIds.push(nodeId);
    }
  }

  private evaluate(v: number, t: MonthIndex, phase: 'window' | 'past'): number | null {
    const node: GraphNode = this.graph.nodes[v];
    const traceInputs: TraceInput[] | null = this.trace ? [] : null;
    let value: number | null = null;
    let variableId: string | null = null;

    switch (node.type) {
      case 'CONSTANT':
        value = node.value;
        break;

      case 'DATA': {
        variableId = node.variableId;
        if (!variableId) break;
        const variable = this.variables.get(variableId);
        if (!variable) {
          this.noteMissingVariable(variableId, node.id);
          break;
        }
        if (APPLICABLE_VARIABLE_TYPES[this.type].indexOf(variable.type) < 0) break;
        const raw = variable.values.get(t - node.lag);
        value = raw === undefined || raw === null ? (node.missingAsZero ? 0 : null) : raw;
        break;
      }

      case 'SEED':
        value = this.read(node.inputs[0], t, traceInputs);
        break;

      case 'OPERATOR': {
        if (node.op === 'offset') {
          value = this.read(node.inputs[0], t, traceInputs);
          break;
        }
        const operands: number[] = [];
        let hasNull = false;
        for (let i = 0; i < node.inputs.length; i++) {
          const operand = this.read(node.inputs[i], t, traceInputs);
          if (operand === null) hasNull = true;
          else operands.push(operand);
        }
        value = hasNull ? null : performOperation(node.op, operands);
        break;
      }

      case 'METRIC': {
        if (phase === 'past') {
          variableId = node.historicalVariableId;
          value = this.variableValue(variableId, t, node.id);
        } else if (this.type === 'forecast' || node.useCalculated) {
          value = node.inputs.length > 0 ? this.read(node.inputs[0], t, traceInputs) : null;
        } else {
          variableId = this.type === 'historical' ? node.historicalVariableId : node.budgetVariableId;
          value = this.variableValue(variableId, t, node.id);
        }
        break;
      }
    }

    if (this.trace) {
      const step: TraceStep = {
        nodeId: node.id,
        nodeType: node.type,
        type: this.type,
        month: t,
        phase,
        value,
        inputs: traceInputs!,
      };
      this.trace.push(variableId ? { ...step, variableId } : step);
    }
    return value;
  }
}

/** Validates the graph and windows, then evaluates every requested calc type. */
export function calculate(input: CalculateInput): CalculateResult {
  const { graph, validation } = buildGraph(input.nodes, input.edges);
  const errors = validation.errors.concat(windowIssues(input.windows));
  if (!graph || errors.length > 0) {
    return { ok: false, errors, warnings: validation.warnings };
  }

  const { actual, forecast } = input.windows;
  const types = CALC_TYPES.filter((type) => input.calculationTypes.indexOf(type) >= 0);
  const calculationTypes = input.calculationTypes.filter(
    (type, i) => CALC_TYPES.indexOf(type) >= 0 && input.calculationTypes.indexOf(type) === i
  );

  const variables = new Map<string, IndexedVariable>();
  input.variables.forEach((variable) => {
    const values = new Map<MonthIndex, number | null>();
    variable.values.forEach((point) => {
      values.set(point.month, typeof point.value === 'number' && Number.isFinite(point.value) ? point.value : null);
    });
    variables.set(variable.id, { type: String(variable.type), values });
  });

  const trace: TraceStep[] | null = input.trace ? [] : null;
  const missingVariables = new Map<string, string[]>();
  const evaluations: Partial<Record<CalcType, Evaluation>> = {};
  types.forEach((type) => {
    const evaluation = new Evaluation(graph, type, rangeOf(type, actual, forecast), variables, missingVariables, trace);
    evaluation.run();
    evaluations[type] = evaluation;
  });

  const months: MonthIndex[] = [];
  const first = Math.min(actual.start, forecast.start);
  const last = Math.max(actual.end, forecast.end);
  for (let m = first; m <= last; m++) {
    if (inWindow('budget', m, actual, forecast)) months.push(m);
  }

  const valueFor = (type: CalcType, node: number, month: MonthIndex): number | null => {
    const evaluation = evaluations[type];
    return evaluation && inWindow(type, month, actual, forecast) ? evaluation.valueAt(node, month) : null;
  };

  const nodes: NodeResult[] = graph.nodes.map((node, v) => ({
    nodeId: node.id,
    nodeType: node.type,
    nodeData: node.data,
    values: months.map((month): MonthValue => {
      const historical = valueFor('historical', v, month);
      const forecastValue = valueFor('forecast', v, month);
      const budget = valueFor('budget', v, month);
      return {
        month,
        historical,
        forecast: forecastValue,
        budget,
        calculated:
          node.type === 'METRIC'
            ? null
            : forecastValue !== null
              ? forecastValue
              : historical !== null
                ? historical
                : budget,
      };
    }),
  }));

  const warnings = validation.warnings.slice();
  const missingIds: string[] = [];
  missingVariables.forEach((_nodeIds, variableId) => missingIds.push(variableId));
  missingIds.sort().forEach((variableId) => {
    warnings.push({
      code: 'VARIABLE_NOT_FOUND',
      severity: 'warning',
      message: `Variable ${variableId} is not available; values that depend on it are empty.`,
      nodeIds: missingVariables.get(variableId)!.slice().sort(),
    });
  });

  return {
    ok: true,
    months,
    calculationTypes,
    nodes,
    warnings,
    order: graph.order.map((v) => graph.nodes[v].id),
    ...(trace ? { trace } : {}),
  };
}
