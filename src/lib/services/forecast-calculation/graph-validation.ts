import { checkConnection, validateGraph, type ClientEdge, type ClientNode, type Issue } from '@vibefc/forecast-engine';
import type { GraphValidationResult } from '@/types/forecast';

/** Anything with the canvas node/edge fields the engine reads (React Flow types `type` as optional). */
interface CanvasNode {
  readonly id: string;
  readonly type?: string;
  readonly data?: unknown;
}
type CanvasEdge = Pick<ClientEdge, 'id' | 'source' | 'target'>;

export interface ForecastGraphValidation extends GraphValidationResult {
  /** Structured issues ({code, nodeIds, path}) for highlighting nodes and cycles. */
  readonly issues: readonly Issue[];
}

const toClientNodes = (nodes: readonly CanvasNode[]): ClientNode[] =>
  nodes.map((node) => ({ id: node.id, type: node.type ?? '', data: node.data }));

const toClientEdges = (edges: readonly CanvasEdge[]): ClientEdge[] =>
  edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));

/**
 * Validates the canvas graph with the same rules the backend calculation uses
 * (packages/forecast-engine; codes in docs/forecast-engine.md §3).
 */
export function validateForecastGraph(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
): ForecastGraphValidation {
  const result = validateGraph(toClientNodes(nodes), toClientEdges(edges));
  return {
    isValid: result.isValid,
    errors: result.errors.map((issue) => issue.message),
    warnings: result.warnings.map((issue) => issue.message),
    issues: result.errors.concat(result.warnings),
  };
}

/** Errors a new edge would introduce, e.g. for React Flow's `isValidConnection`. */
export function checkForecastConnection(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  connection: { source: string; target: string }
): Issue[] {
  return checkConnection(toClientNodes(nodes), toClientEdges(edges), connection);
}

/**
 * `^` needs exactly two inputs, so its first input on its own is an INVALID_INPUT_COUNT
 * error. The canvas adds edges one at a time, so it must not reject that first input.
 */
function isOperandStillMissing(
  issue: Issue,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  target: string
): boolean {
  if (issue.code !== 'INVALID_INPUT_COUNT' || issue.nodeIds.length !== 1 || issue.nodeIds[0] !== target) {
    return false;
  }
  const node = nodes.find((n) => n.id === target);
  const op = node && node.data !== null && typeof node.data === 'object' ? (node.data as { op?: unknown }).op : undefined;
  if (node?.type !== 'OPERATOR' || op !== '^') {
    return false;
  }
  return edges.filter((edge) => edge.target === target).length + 1 < 2;
}

/**
 * Why the canvas refuses a new edge, or null when it may be drawn: the first error
 * `checkForecastConnection` reports, except an operand that is merely still missing.
 */
export function getConnectionRejection(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  connection: { source: string; target: string }
): string | null {
  const errors = checkForecastConnection(nodes, edges, connection).filter(
    (issue) => !isOperandStillMissing(issue, nodes, edges, connection.target)
  );
  return errors.length > 0 ? errors[0].message : null;
}

/** Issue codes that describe a loop; the canvas highlights their nodes and the edges along `path`. */
const LOOP_ISSUE_CODES: readonly Issue['code'][] = ['CYCLE', 'UNGROUNDED_RECURRENCE'];

export interface LoopHighlights {
  readonly nodeIds: ReadonlySet<string>;
  readonly edgeIds: ReadonlySet<string>;
}

/** Nodes and edges involved in CYCLE / UNGROUNDED_RECURRENCE issues. */
export function getLoopHighlights(
  issues: readonly Issue[] | undefined,
  edges: readonly CanvasEdge[]
): LoopHighlights {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  (issues ?? [])
    .filter((issue) => LOOP_ISSUE_CODES.indexOf(issue.code) >= 0)
    .forEach((issue) => {
      issue.nodeIds.forEach((id) => nodeIds.add(id));
      const path = issue.path ?? [];
      for (let i = 0; i + 1 < path.length; i++) {
        edges
          .filter((edge) => edge.source === path[i] && edge.target === path[i + 1])
          .forEach((edge) => edgeIds.add(edge.id));
      }
    });
  return { nodeIds, edgeIds };
}
