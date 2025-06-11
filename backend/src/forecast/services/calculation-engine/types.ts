// Types for backend calculation engine
// Adapted from frontend types to work in Node.js environment

export interface TimeSeriesData {
  date: Date;
  value: number | null;
}

export interface Variable {
  id: string;
  name: string;
  type: 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN';
  organizationId: string;
  timeSeries: TimeSeriesData[];
}

// Node types for calculation engine
export interface ForecastNodeClient {
  id: string;
  type: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
  data: unknown;
  position: { x: number; y: number };
}

export interface ForecastEdgeClient {
  id: string;
  source: string;
  target: string;
}

// Calculation result types
export interface MonthlyForecastValue {
  readonly date: Date; // First of month
  readonly forecast: number | null;
  readonly budget: number | null;
  readonly historical: number | null;
}

// Extended monthly value to include calculated values for all node types
export interface MonthlyNodeValue extends MonthlyForecastValue {
  readonly calculated: number | null; // For OPERATOR, SEED, and calculated METRIC nodes
}

export interface MetricCalculationResult {
  readonly metricNodeId: string;
  readonly values: MonthlyForecastValue[];
}

// New calculation result for all node types (extends existing pattern)
export interface NodeCalculationResult {
  readonly nodeId: string;
  readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
  readonly values: MonthlyNodeValue[];
}

export interface ForecastCalculationResult {
  readonly forecastId: string;
  readonly calculatedAt: Date;
  readonly metrics: MetricCalculationResult[];
}

// Extend existing ForecastCalculationResult to include all nodes
export interface ExtendedForecastCalculationResult extends ForecastCalculationResult {
  readonly allNodes: NodeCalculationResult[]; // All node calculation results
}

// Tree structure for calculation
export interface CalculationTreeNode {
  readonly nodeId: string;
  readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
  readonly nodeData: unknown;
  readonly children: CalculationTreeNode[];
  readonly inputOrder?: readonly string[]; // For operator nodes
}

export interface CalculationTree {
  readonly rootMetricNodeId: string;
  readonly tree: CalculationTreeNode;
}

// Graph validation result with detailed error reporting
export interface GraphValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// Node attribute types
export interface DataNodeAttributes {
  name: string;
  variableId: string;
  offsetMonths: number;
}

export interface ConstantNodeAttributes {
  name: string;
  value: number;
}

export interface OperatorNodeAttributes {
  op: '+' | '-' | '*' | '/' | '^';
  inputOrder: string[];
}

export interface MetricNodeAttributes {
  label: string;
  budgetVariableId: string;
  historicalVariableId: string;
  useCalculated: boolean;
}

export interface SeedNodeAttributes {
  sourceMetricId: string;
}

export type NodeAttributes = 
  | DataNodeAttributes
  | ConstantNodeAttributes
  | OperatorNodeAttributes
  | MetricNodeAttributes
  | SeedNodeAttributes; 