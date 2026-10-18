/**
 * Public types of the forecast engine. Semantics: docs/forecast-engine.md.
 */

/** `year * 12 + (month - 1)`; January 2025 is 24300. */
export type MonthIndex = number;

export type CalcType = 'historical' | 'forecast' | 'budget';
export const CALC_TYPES: readonly CalcType[] = ['historical', 'forecast', 'budget'];

export type NodeType = 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
export type Operator = '+' | '-' | '*' | '/' | '^' | 'offset';

// ---------------------------------------------------------------------------
// Client graph: what the canvas and the database store
// ---------------------------------------------------------------------------

export interface ClientNode {
  readonly id: string;
  readonly type: string;
  readonly data?: unknown;
}

export interface ClientEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  /** Operand position; only used for inputs not listed in the operator's `inputOrder`. */
  readonly rank?: number | null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'NO_METRIC'
  | 'DANGLING_EDGE'
  | 'UNKNOWN_NODE_TYPE'
  | 'INVALID_OPERATOR'
  | 'OPERATOR_WITHOUT_INPUTS'
  | 'INVALID_INPUT_COUNT'
  | 'INVALID_OFFSET'
  | 'INPUT_NOT_ALLOWED'
  | 'INVALID_CONSTANT'
  | 'SEED_WITHOUT_SOURCE'
  | 'SEED_SOURCE_NOT_FOUND'
  | 'SEED_SOURCE_NOT_METRIC'
  | 'SEED_SOURCE_CONFLICT'
  | 'CYCLE'
  | 'UNGROUNDED_RECURRENCE'
  | 'INVALID_WINDOW';

export type WarningCode =
  | 'DISCONNECTED_NODE'
  | 'METRIC_WITHOUT_INPUT'
  | 'METRIC_WITHOUT_HISTORICAL_VARIABLE'
  | 'METRIC_WITHOUT_BUDGET_VARIABLE'
  | 'DATA_WITHOUT_VARIABLE'
  | 'INPUT_ORDER_INCOMPLETE'
  | 'INPUT_ORDER_UNKNOWN'
  | 'MISSING_LABEL'
  | 'VARIABLE_NOT_FOUND';

export type IssueCode = ErrorCode | WarningCode;

export interface Issue {
  readonly code: IssueCode;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  /** Nodes involved; for a cycle, the whole strongly connected component. */
  readonly nodeIds: readonly string[];
  readonly edgeIds?: readonly string[];
  /** For cycles: node ids in data-flow order, first node repeated at the end. */
  readonly path?: readonly string[];
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly Issue[];
  readonly warnings: readonly Issue[];
}

// ---------------------------------------------------------------------------
// Normalized graph
// ---------------------------------------------------------------------------

export interface Input {
  /** Index of the source node in `Graph.nodes`. */
  readonly source: number;
  /** Months back the input is read; always >= 0. */
  readonly lag: number;
}

interface GraphNodeBase {
  readonly id: string;
  /** The original attributes, passed through to the results. */
  readonly data: unknown;
  readonly inputs: readonly Input[];
}

export interface ConstantGraphNode extends GraphNodeBase {
  readonly type: 'CONSTANT';
  readonly value: number;
}

export interface DataGraphNode extends GraphNodeBase {
  readonly type: 'DATA';
  readonly variableId: string | null;
  /** Reads the variable at `t - lag`; negative = a lead (stored `offsetMonths`). */
  readonly lag: number;
  readonly missingAsZero: boolean;
}

export interface OperatorGraphNode extends GraphNodeBase {
  readonly type: 'OPERATOR';
  readonly op: Operator;
}

export interface MetricGraphNode extends GraphNodeBase {
  readonly type: 'METRIC';
  readonly useCalculated: boolean;
  readonly historicalVariableId: string | null;
  readonly budgetVariableId: string | null;
}

export interface SeedGraphNode extends GraphNodeBase {
  readonly type: 'SEED';
}

export type GraphNode =
  | ConstantGraphNode
  | DataGraphNode
  | OperatorGraphNode
  | MetricGraphNode
  | SeedGraphNode;

export interface Graph {
  /** In client order. */
  readonly nodes: readonly GraphNode[];
  readonly indexById: ReadonlyMap<string, number>;
  /** Node indices in topological order of the same-month graph, ties broken by id. */
  readonly order: readonly number[];
}

export interface BuildGraphResult {
  /** Present only when there are no errors. */
  readonly graph: Graph | null;
  readonly validation: ValidationResult;
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

export type VariableType = 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN';

export interface VariablePoint {
  readonly month: MonthIndex;
  readonly value: number | null;
}

export interface EngineVariable {
  readonly id: string;
  readonly type: VariableType | string;
  readonly values: readonly VariablePoint[];
}

export interface Window {
  readonly start: MonthIndex;
  readonly end: MonthIndex;
}

export interface CalculateInput {
  readonly nodes: readonly ClientNode[];
  readonly edges: readonly ClientEdge[];
  readonly variables: readonly EngineVariable[];
  readonly windows: { readonly actual: Window; readonly forecast: Window };
  readonly calculationTypes: readonly CalcType[];
  readonly trace?: boolean;
}

export interface MonthValue {
  readonly month: MonthIndex;
  readonly historical: number | null;
  readonly forecast: number | null;
  readonly budget: number | null;
  /** `forecast ?? historical ?? budget` for non-METRIC nodes, `null` for METRIC. */
  readonly calculated: number | null;
}

export interface NodeResult {
  readonly nodeId: string;
  readonly nodeType: NodeType;
  readonly nodeData: unknown;
  readonly values: readonly MonthValue[];
}

export interface TraceInput {
  readonly nodeId: string;
  readonly lag: number;
  readonly month: MonthIndex;
  readonly value: number | null;
}

export interface TraceStep {
  readonly nodeId: string;
  readonly nodeType: NodeType;
  readonly type: CalcType;
  readonly month: MonthIndex;
  /** 'window': inside the calc type's range; 'past': a base-case value before it. */
  readonly phase: 'window' | 'past';
  readonly value: number | null;
  readonly inputs: readonly TraceInput[];
  readonly variableId?: string;
}

export interface CalculateSuccess {
  readonly ok: true;
  /** Ascending months of `actual ∪ forecast`; every node has one value per month. */
  readonly months: readonly MonthIndex[];
  readonly calculationTypes: readonly CalcType[];
  readonly nodes: readonly NodeResult[];
  readonly warnings: readonly Issue[];
  /** Topological order (node ids) the calculation used. */
  readonly order: readonly string[];
  readonly trace?: readonly TraceStep[];
}

export interface CalculateFailure {
  readonly ok: false;
  readonly errors: readonly Issue[];
  readonly warnings: readonly Issue[];
}

export type CalculateResult = CalculateSuccess | CalculateFailure;
