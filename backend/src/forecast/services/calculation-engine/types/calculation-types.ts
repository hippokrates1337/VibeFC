/**
 * Refactored calculation engine types - Phase 1.1
 * Consolidates all calculation-related types into a unified structure
 */

import type { Variable } from '../types';

// Re-export Variable for use by other modules
export type { Variable };

// ========================================
// Core Calculation Types
// ========================================

export type CalculationType = 'historical' | 'forecast' | 'budget';
export type NodeType = 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

// ========================================
// Request/Response Types
// ========================================

export interface CalculationRequest {
  readonly trees: CalculationTree[];
  readonly periods: {
    readonly forecast: { start: string; end: string }; // MM-YYYY
    readonly actual: { start: string; end: string };   // MM-YYYY
  };
  readonly calculationTypes: CalculationType[];
  readonly includeAllNodes: boolean;
  readonly variables: Variable[];
}

export interface CalculationResult {
  forecastId: string;
  calculatedAt: Date;
  calculationTypes: CalculationType[];
  periodInfo: PeriodInfo;
  nodeResults: NodeResult[];
}

export interface PeriodInfo {
  readonly forecastStartMonth: string; // MM-YYYY
  readonly forecastEndMonth: string;   // MM-YYYY
  readonly actualStartMonth: string;   // MM-YYYY
  readonly actualEndMonth: string;     // MM-YYYY
}

export interface NodeResult {
  readonly nodeId: string;
  readonly nodeType: NodeType;
  readonly nodeData?: unknown; // Preserve node attributes/configuration
  readonly values: MonthlyValue[];
}

export interface MonthlyValue {
  month: string; // MM-YYYY
  historical: number | null;
  forecast: number | null;
  budget: number | null;
  calculated: number | null; // For intermediate nodes
}

// ========================================
// Tree Structure Types
// ========================================

export interface CalculationTree {
  readonly rootMetricNodeId: string;
  readonly tree: CalculationTreeNode;
}

export interface CalculationTreeNode {
  readonly nodeId: string;
  readonly nodeType: NodeType;
  readonly nodeData: unknown;
  readonly children: CalculationTreeNode[];
  readonly inputOrder?: readonly string[]; // For operator nodes
  isReference?: boolean; // Flag to indicate this is a reference to avoid duplication
}

// ========================================
// Context and Configuration Types
// ========================================

export interface CalculationContext {
  readonly variables: Variable[];
  readonly periods: PeriodConfiguration;
  readonly cache: CalculationCache;
  readonly nodeResults: Map<string, NodeResult>;
  readonly request: CalculationRequest;
  readonly logger: Logger;
  /**
   * While a METRIC node is being calculated, forecast values per month before its
   * NodeResult is finalized. Enables SEED to read the same-tree source metric's
   * previous-month forecast (otherwise nodeResults is empty until calculateNode completes).
   */
  runningMetricForecasts: Map<string, Map<string, number | null>>;
}

export interface PeriodConfiguration {
  readonly forecastMonths: string[]; // MM-YYYY
  readonly actualMonths: string[];   // MM-YYYY  
  readonly allMonths: string[];      // MM-YYYY sorted
}

// ========================================
// Service Interfaces
// ========================================

export interface CalculationCache {
  get(key: string): number | null | undefined;
  set(key: string, value: number | null): void;
  clear(): void;
  generateKey(nodeId: string, month: string, calculationType: CalculationType): string;
}

export interface Logger {
  log(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
}

// ========================================
// Validation Types
// ========================================

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

// ========================================
// Strategy Pattern Types
// ========================================

export interface NodeEvaluationStrategy {
  evaluate(
    node: CalculationTreeNode,
    month: string, // MM-YYYY
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null>;
}

// ========================================
// Node Attribute Types (reused from existing)
// ========================================

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

// ========================================
// Error Types
// ========================================

export class CalculationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[] = [],
    public readonly nodeId?: string,
    public readonly calculationType?: CalculationType
  ) {
    super(message);
    this.name = 'CalculationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ========================================
// Utility Types
// ========================================

export interface MonthUtility {
  isValidMMYYYY(month: string): boolean;
  compareMonths(month1: string, month2: string): number;
  getMonthsBetween(startMonth: string, endMonth: string): string[];
  addMonths(month: string, monthsToAdd: number): string;
  subtractMonths(month: string, monthsToSubtract: number): string;
  dateToMMYYYY(date: Date): string;
  mmyyyyToFirstOfMonth(month: string): Date;
}
