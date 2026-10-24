/**
 * Client graph -> normalized graph, plus validation (docs/forecast-engine.md §2–3).
 *
 * This file is also compiled by the frontend (target ES5 without downlevelIteration):
 * no for-of over Map/Set and no spreading of iterables other than arrays.
 */
import type {
  BuildGraphResult,
  ClientEdge,
  ClientNode,
  Graph,
  GraphNode,
  Input,
  Issue,
  IssueCode,
  NodeType,
  Operator,
  ValidationResult,
} from './types';

const NODE_TYPES: readonly string[] = ['DATA', 'CONSTANT', 'OPERATOR', 'METRIC', 'SEED'];
const OPERATORS: readonly string[] = ['+', '-', '*', '/', '^', 'offset'];
const NON_COMMUTATIVE: readonly string[] = ['-', '/', '^'];

type Attrs = Record<string, unknown>;

const attrsOf = (node: ClientNode): Attrs =>
  node.data !== null && typeof node.data === 'object' ? (node.data as Attrs) : {};

const stringAttr = (attrs: Attrs, key: string): string | null => {
  const value = attrs[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
};

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

class IssueList {
  readonly errors: Issue[] = [];
  readonly warnings: Issue[] = [];

  error(code: IssueCode, message: string, nodeIds: string[], extra: Partial<Issue> = {}): void {
    this.errors.push({ code, severity: 'error', message, nodeIds: sortedUnique(nodeIds), ...extra });
  }

  warning(code: IssueCode, message: string, nodeIds: string[], extra: Partial<Issue> = {}): void {
    this.warnings.push({ code, severity: 'warning', message, nodeIds: sortedUnique(nodeIds), ...extra });
  }

  result(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: sortIssues(this.errors),
      warnings: sortIssues(this.warnings),
    };
  }
}

function sortedUnique(ids: readonly string[]): string[] {
  const out: string[] = [];
  const sorted = ids.slice().sort(compareStrings);
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i] !== sorted[i - 1]) {
      out.push(sorted[i]);
    }
  }
  return out;
}

function issueKey(issue: Issue): string {
  return [issue.code, issue.nodeIds.join(','), (issue.edgeIds ?? []).join(','), issue.message].join('|');
}

function sortIssues(issues: Issue[]): Issue[] {
  return issues.slice().sort((a, b) => compareStrings(issueKey(a), issueKey(b)));
}

/** Human-readable node name for messages. */
function describe(node: ClientNode): string {
  const attrs = attrsOf(node);
  const name = stringAttr(attrs, 'label') ?? stringAttr(attrs, 'name');
  if (node.type === 'OPERATOR' && typeof attrs.op === 'string') {
    return name ? `${name} (${attrs.op})` : `operator ${attrs.op} [${node.id}]`;
  }
  return name ? `${node.type} "${name}"` : `${node.type} [${node.id}]`;
}

/** Inputs ordered by `inputOrder`, then rank, then source id, then edge id (§2 Operand order). */
function orderOperands(edges: readonly ClientEdge[], inputOrder: readonly string[]): ClientEdge[] {
  const position = (edge: ClientEdge): number => {
    const index = inputOrder.indexOf(edge.source);
    return index >= 0 ? index : Infinity;
  };
  const rank = (edge: ClientEdge): number =>
    typeof edge.rank === 'number' && Number.isFinite(edge.rank) ? edge.rank : Infinity;
  return edges.slice().sort((a, b) => {
    if (position(a) !== position(b)) return position(a) < position(b) ? -1 : 1;
    if (rank(a) !== rank(b)) return rank(a) < rank(b) ? -1 : 1;
    if (a.source !== b.source) return compareStrings(a.source, b.source);
    return compareStrings(a.id, b.id);
  });
}

/**
 * Tarjan's strongly connected components over `successors` (data-flow direction).
 * Returns components with more than one node or a self-loop, each sorted by node id.
 */
function cyclicComponents(count: number, successors: readonly number[][], ids: readonly string[]): number[][] {
  let counter = 0;
  const index: number[] = new Array(count).fill(-1);
  const low: number[] = new Array(count).fill(0);
  const onStack: boolean[] = new Array(count).fill(false);
  const stack: number[] = [];
  const components: number[][] = [];

  const connect = (v: number): void => {
    index[v] = counter;
    low[v] = counter;
    counter++;
    stack.push(v);
    onStack[v] = true;
    const next = successors[v];
    for (let i = 0; i < next.length; i++) {
      const w = next[i];
      if (index[w] === -1) {
        connect(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack[w]) {
        low[v] = Math.min(low[v], index[w]);
      }
    }
    if (low[v] === index[v]) {
      const component: number[] = [];
      let w: number;
      do {
        w = stack.pop()!;
        onStack[w] = false;
        component.push(w);
      } while (w !== v);
      if (component.length > 1 || successors[v].indexOf(v) >= 0) {
        components.push(component.sort((a, b) => compareStrings(ids[a], ids[b])));
      }
    }
  };

  for (let v = 0; v < count; v++) {
    if (index[v] === -1) {
      connect(v);
    }
  }
  return components.sort((a, b) => compareStrings(ids[a[0]], ids[b[0]]));
}

/** Shortest cycle through the component's smallest-id node, in data-flow order. */
function cyclePath(component: readonly number[], successors: readonly number[][], ids: readonly string[]): string[] {
  const start = component[0];
  const inComponent = (v: number) => component.indexOf(v) >= 0;
  const sortedNext = (v: number) =>
    successors[v].filter(inComponent).sort((a, b) => compareStrings(ids[a], ids[b]));

  const parent = new Map<number, number>();
  const queue: number[] = [];
  const firstSteps = sortedNext(start);
  if (firstSteps.indexOf(start) >= 0) {
    return [ids[start], ids[start]];
  }
  for (let i = 0; i < firstSteps.length; i++) {
    if (!parent.has(firstSteps[i])) {
      parent.set(firstSteps[i], start);
      queue.push(firstSteps[i]);
    }
  }
  while (queue.length > 0) {
    const v = queue.shift()!;
    const next = sortedNext(v);
    for (let i = 0; i < next.length; i++) {
      const w = next[i];
      if (w === start) {
        const path = [ids[start]];
        for (let u = v; u !== start; u = parent.get(u)!) {
          path.push(ids[u]);
        }
        path.push(ids[start]);
        // path is start, v, parent(v), ..., start: reverse the middle into data-flow order
        const middle = path.slice(1, -1).reverse();
        return [ids[start]].concat(middle, [ids[start]]);
      }
      if (!parent.has(w)) {
        parent.set(w, v);
        queue.push(w);
      }
    }
  }
  return component.map((v) => ids[v]);
}

/** Kahn's algorithm over the lag-0 inputs; ready nodes are taken in id order. */
function topologicalOrder(nodes: readonly GraphNode[]): number[] {
  const count = nodes.length;
  const indegree: number[] = new Array(count).fill(0);
  const successors: number[][] = nodes.map(() => []);
  for (let v = 0; v < count; v++) {
    const inputs = nodes[v].inputs;
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].lag === 0) {
        indegree[v]++;
        successors[inputs[i].source].push(v);
      }
    }
  }
  const ready: number[] = [];
  for (let v = 0; v < count; v++) {
    if (indegree[v] === 0) ready.push(v);
  }
  const order: number[] = [];
  while (ready.length > 0) {
    let best = 0;
    for (let i = 1; i < ready.length; i++) {
      if (compareStrings(nodes[ready[i]].id, nodes[ready[best]].id) < 0) best = i;
    }
    const v = ready.splice(best, 1)[0];
    order.push(v);
    const next = successors[v];
    for (let i = 0; i < next.length; i++) {
      indegree[next[i]]--;
      if (indegree[next[i]] === 0) ready.push(next[i]);
    }
  }
  if (order.length !== count) {
    throw new Error('topologicalOrder: graph has a same-month cycle (validation should have caught it)');
  }
  return order;
}

/** Normalizes and validates the client graph. `graph` is null when there are errors. */
export function buildGraph(clientNodes: readonly ClientNode[], clientEdges: readonly ClientEdge[]): BuildGraphResult {
  const issues = new IssueList();
  const ids = clientNodes.map((n) => n.id);
  const indexById = new Map<string, number>();
  clientNodes.forEach((node, i) => indexById.set(node.id, i));
  const typeOf = (id: string): string | undefined => {
    const i = indexById.get(id);
    return i === undefined ? undefined : clientNodes[i].type;
  };

  // Edges: drop dangling ones, group by target.
  const incoming: ClientEdge[][] = clientNodes.map(() => []);
  const connected: boolean[] = clientNodes.map(() => false);
  clientEdges.forEach((edge) => {
    const source = indexById.get(edge.source);
    const target = indexById.get(edge.target);
    if (source === undefined || target === undefined) {
      const missing = source === undefined ? `source ${edge.source}` : `target ${edge.target}`;
      issues.error('DANGLING_EDGE', `Edge ${edge.id} points to a node that does not exist (${missing}).`, [edge.source, edge.target].filter((id) => indexById.has(id)), { edgeIds: [edge.id] });
      return;
    }
    incoming[target].push(edge);
    connected[source] = true;
    connected[target] = true;
  });

  const nodes: GraphNode[] = [];
  let metricCount = 0;

  clientNodes.forEach((node, v) => {
    const attrs = attrsOf(node);
    const edges = incoming[v];
    const edgeIds = edges.map((e) => e.id);
    const lagZero = (list: readonly ClientEdge[]): Input[] =>
      list.map((e) => ({ source: indexById.get(e.source)!, lag: 0 }));
    const base = { id: node.id, data: node.data };

    if (NODE_TYPES.indexOf(node.type) < 0) {
      issues.error('UNKNOWN_NODE_TYPE', `Node ${node.id} has unknown type "${node.type}".`, [node.id]);
      nodes.push({ ...base, type: 'CONSTANT', value: 0, inputs: [] });
      return;
    }

    if (!connected[v] && node.type !== 'METRIC') {
      issues.warning('DISCONNECTED_NODE', `${describe(node)} is not connected to any other node.`, [node.id]);
    }

    switch (node.type as NodeType) {
      case 'CONSTANT': {
        const value = attrs.value;
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          issues.error('INVALID_CONSTANT', `${describe(node)} needs a finite number as its value.`, [node.id]);
        }
        if (edges.length > 0) {
          issues.error('INPUT_NOT_ALLOWED', `${describe(node)} cannot have inputs.`, [node.id], { edgeIds });
        }
        nodes.push({ ...base, type: 'CONSTANT', value: typeof value === 'number' ? value : NaN, inputs: [] });
        return;
      }

      case 'DATA': {
        const variableId = stringAttr(attrs, 'variableId');
        if (!variableId) {
          issues.warning('DATA_WITHOUT_VARIABLE', `${describe(node)} has no variable selected; its values are empty.`, [node.id]);
        }
        const offset = attrs.offsetMonths === undefined || attrs.offsetMonths === null ? 0 : attrs.offsetMonths;
        if (typeof offset !== 'number' || !Number.isInteger(offset)) {
          issues.error('INVALID_OFFSET', `${describe(node)} needs a whole number of months as its offset.`, [node.id]);
        }
        if (edges.length > 0) {
          issues.error('INPUT_NOT_ALLOWED', `${describe(node)} cannot have inputs.`, [node.id], { edgeIds });
        }
        nodes.push({
          ...base,
          type: 'DATA',
          variableId,
          lag: typeof offset === 'number' && Number.isInteger(offset) ? -offset : 0,
          missingAsZero: attrs.missingAsZero === true,
          inputs: [],
        });
        return;
      }

      case 'OPERATOR': {
        const op = attrs.op;
        if (typeof op !== 'string' || OPERATORS.indexOf(op) < 0) {
          issues.error('INVALID_OPERATOR', `${describe(node)} has an unknown operator "${String(op)}".`, [node.id]);
          nodes.push({ ...base, type: 'OPERATOR', op: '+', inputs: lagZero(edges) });
          return;
        }
        if (op === 'offset') {
          const months = attrs.offsetMonths;
          const validMonths = typeof months === 'number' && Number.isInteger(months) && months >= 0;
          if (!validMonths) {
            issues.error('INVALID_OFFSET', `${describe(node)} needs a whole number of months (0 or more) to look back.`, [node.id]);
          }
          if (edges.length !== 1) {
            issues.error('INVALID_INPUT_COUNT', `${describe(node)} needs exactly one input (found ${edges.length}).`, [node.id], { edgeIds });
          }
          const lag = validMonths ? (months as number) : 0;
          nodes.push({
            ...base,
            type: 'OPERATOR',
            op: 'offset',
            inputs: orderOperands(edges, []).map((e) => ({ source: indexById.get(e.source)!, lag })),
          });
          return;
        }

        const inputOrder = Array.isArray(attrs.inputOrder)
          ? (attrs.inputOrder as unknown[]).filter((x): x is string => typeof x === 'string')
          : [];
        const ordered = orderOperands(edges, inputOrder);
        if (edges.length === 0) {
          issues.error('OPERATOR_WITHOUT_INPUTS', `${describe(node)} has no inputs.`, [node.id]);
        } else if (op === '^' && edges.length !== 2) {
          issues.error('INVALID_INPUT_COUNT', `${describe(node)} needs exactly two inputs (base and exponent), found ${edges.length}.`, [node.id], { edgeIds });
        }
        const sources = edges.map((e) => e.source);
        const unlisted = sortedUnique(sources.filter((s) => inputOrder.indexOf(s) < 0));
        const unknown = sortedUnique(inputOrder.filter((s) => sources.indexOf(s) < 0));
        if (unlisted.length > 0 && edges.length > 1) {
          issues.warning('INPUT_ORDER_INCOMPLETE', `${describe(node)}: inputs ${unlisted.join(', ')} have no position; they are used after the ordered inputs, sorted by id.`, [node.id].concat(unlisted));
        }
        if (unknown.length > 0) {
          issues.warning('INPUT_ORDER_UNKNOWN', `${describe(node)}: input order lists ${unknown.join(', ')}, which ${unknown.length === 1 ? 'is' : 'are'} not connected.`, [node.id]);
        }
        nodes.push({ ...base, type: 'OPERATOR', op: op as Operator, inputs: lagZero(ordered) });
        return;
      }

      case 'METRIC': {
        metricCount++;
        const useCalculated = attrs.useCalculated === true;
        const historicalVariableId = stringAttr(attrs, 'historicalVariableId');
        const budgetVariableId = stringAttr(attrs, 'budgetVariableId');
        if (edges.length > 1) {
          issues.error('INVALID_INPUT_COUNT', `${describe(node)} can have only one input (found ${edges.length}); combine inputs with an operator.`, [node.id], { edgeIds });
        } else if (edges.length === 0) {
          issues.warning('METRIC_WITHOUT_INPUT', `${describe(node)} has no input; its calculated values are empty.`, [node.id]);
        }
        if (!historicalVariableId) {
          issues.warning('METRIC_WITHOUT_HISTORICAL_VARIABLE', `${describe(node)} has no historical variable; values before a window starts are empty.`, [node.id]);
        }
        if (!budgetVariableId && !useCalculated) {
          issues.warning('METRIC_WITHOUT_BUDGET_VARIABLE', `${describe(node)} has no budget variable; budget values are empty.`, [node.id]);
        }
        if (!stringAttr(attrs, 'label')) {
          issues.warning('MISSING_LABEL', `METRIC [${node.id}] has no label.`, [node.id]);
        }
        nodes.push({
          ...base,
          type: 'METRIC',
          useCalculated,
          historicalVariableId,
          budgetVariableId,
          inputs: lagZero(orderOperands(edges, [])),
        });
        return;
      }

      case 'SEED': {
        const fromMetrics = edges.filter((e) => typeOf(e.source) === 'METRIC');
        const fromOthers = edges.filter((e) => typeOf(e.source) !== 'METRIC');
        if (fromOthers.length > 0) {
          issues.error('INPUT_NOT_ALLOWED', `${describe(node)} can only be fed by a METRIC (it reads that metric last month).`, [node.id].concat(fromOthers.map((e) => e.source)), { edgeIds: fromOthers.map((e) => e.id) });
        }
        const edgeSources = sortedUnique(fromMetrics.map((e) => e.source));
        const configured = stringAttr(attrs, 'sourceMetricId');
        let source: string | null = null;
        if (configured) {
          if (!indexById.has(configured)) {
            issues.error('SEED_SOURCE_NOT_FOUND', `${describe(node)} refers to metric ${configured}, which does not exist. Pick the source metric again or save the forecast.`, [node.id]);
          } else if (typeOf(configured) !== 'METRIC') {
            issues.error('SEED_SOURCE_NOT_METRIC', `${describe(node)} must refer to a METRIC, not ${describe(clientNodes[indexById.get(configured)!])}.`, [node.id, configured]);
          } else {
            source = configured;
          }
          const conflicting = edgeSources.filter((s) => s !== configured);
          if (conflicting.length > 0) {
            issues.error('SEED_SOURCE_CONFLICT', `${describe(node)} is set to metric ${configured} but connected from ${conflicting.join(', ')}.`, [node.id, configured].concat(conflicting));
            source = null;
          }
        } else if (edgeSources.length === 1) {
          source = edgeSources[0];
        } else if (edgeSources.length > 1) {
          issues.error('SEED_SOURCE_CONFLICT', `${describe(node)} is connected from several metrics (${edgeSources.join(', ')}); it can read only one.`, [node.id].concat(edgeSources));
        } else {
          issues.error('SEED_WITHOUT_SOURCE', `${describe(node)} has no source metric.`, [node.id]);
        }
        nodes.push({
          ...base,
          type: 'SEED',
          inputs: source === null ? [] : [{ source: indexById.get(source)!, lag: 1 }],
        });
        return;
      }
    }
  });

  if (metricCount === 0) {
    issues.error('NO_METRIC', 'The forecast needs at least one METRIC node.', []);
  }

  // Cycles (§3): same-month graph first, then grounding.
  const sameMonth: number[][] = nodes.map(() => []);
  const grounding: number[][] = nodes.map(() => []);
  nodes.forEach((node, v) => {
    node.inputs.forEach((input) => {
      if (input.lag === 0) sameMonth[input.source].push(v);
      if (node.type !== 'METRIC') grounding[input.source].push(v);
    });
  });
  const cycles = cyclicComponents(nodes.length, sameMonth, ids);
  cycles.forEach((component) => {
    const path = cyclePath(component, sameMonth, ids);
    const names = path.map((id) => describe(clientNodes[indexById.get(id)!]));
    issues.error('CYCLE', `Circular dependency within the same month: ${names.join(' → ')}. Use a SEED or an offset of at least one month to refer to an earlier month.`, component.map((v) => ids[v]), { path });
  });
  if (cycles.length === 0) {
    cyclicComponents(nodes.length, grounding, ids).forEach((component) => {
      const path = cyclePath(component, grounding, ids);
      const names = path.map((id) => describe(clientNodes[indexById.get(id)!]));
      issues.error('UNGROUNDED_RECURRENCE', `Recurrence without a starting value: ${names.join(' → ')}. A loop over earlier months must pass through a METRIC, whose actuals start it.`, component.map((v) => ids[v]), { path });
    });
  }

  const validation = issues.result();
  if (!validation.isValid) {
    return { graph: null, validation };
  }
  const graph: Graph = { nodes, indexById, order: topologicalOrder(nodes) };
  return { graph, validation };
}

export function validateGraph(nodes: readonly ClientNode[], edges: readonly ClientEdge[]): ValidationResult {
  return buildGraph(nodes, edges).validation;
}

/**
 * The errors a new edge would introduce (for the canvas's `isValidConnection`); errors
 * the graph already has are left out. Warnings are not reported.
 */
export function checkConnection(
  nodes: readonly ClientNode[],
  edges: readonly ClientEdge[],
  connection: { source: string; target: string }
): Issue[] {
  const before = validateGraph(nodes, edges).errors.map(issueKey);
  const candidate: ClientEdge = { id: '__candidate__', source: connection.source, target: connection.target };
  return validateGraph(nodes, edges.concat([candidate])).errors.filter((issue) => before.indexOf(issueKey(issue)) < 0);
}
