// New calculation result types
export interface MonthlyForecastValue {
  readonly date: Date; // First of month
  readonly forecast: number | null;
  readonly budget: number | null;
  readonly historical: number | null;
}

export interface MetricCalculationResult {
  readonly metricNodeId: string;
  readonly values: MonthlyForecastValue[];
}

export interface ForecastCalculationResult {
  readonly forecastId: string;
  readonly calculatedAt: Date;
  readonly metrics: MetricCalculationResult[];
}

// Tree structure for calculation
export interface CalculationTreeNode {
  readonly nodeId: string;
  readonly nodeType: import('@/lib/store/forecast-graph-store').ForecastNodeKind;
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