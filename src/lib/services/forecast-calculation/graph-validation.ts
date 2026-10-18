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
