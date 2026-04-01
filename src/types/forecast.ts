// ============================================================================
// PHASE 5: UNIFIED MM-YYYY CALCULATION TYPES (PRIMARY)
// ============================================================================

// NEW: Unified monthly value with MM-YYYY format (Phase 4)
export interface UnifiedMonthlyValue {
  readonly month: string; // MM-YYYY format
  readonly forecast: number | null;
  readonly budget: number | null;
  readonly historical: number | null;
  readonly calculated?: number | null; // For nodes (not metrics)
}

export interface UnifiedNodeResult {
  readonly nodeId: string;
  readonly nodeType: import('@/lib/store/forecast-graph-store').ForecastNodeKind;
  readonly values: UnifiedMonthlyValue[];
}

export interface UnifiedCalculationResult {
  readonly id: string;
  readonly forecastId: string;
  readonly calculatedAt: Date;
  readonly calculationTypes: readonly ('historical' | 'forecast' | 'budget')[];
  readonly periodInfo: {
    readonly forecastStartMonth: string; // MM-YYYY
    readonly forecastEndMonth: string; // MM-YYYY
    readonly actualStartMonth: string; // MM-YYYY
    readonly actualEndMonth: string; // MM-YYYY
  };
  readonly metrics: UnifiedNodeResult[];
  readonly allNodes?: UnifiedNodeResult[];
}

// NEW: Period management types for unified system (Phase 1)
export interface ForecastPeriods {
  readonly forecastStartMonth: string; // MM-YYYY
  readonly forecastEndMonth: string; // MM-YYYY
  readonly actualStartMonth: string; // MM-YYYY
  readonly actualEndMonth: string; // MM-YYYY
}

export interface UpdatePeriodsRequest {
  readonly forecastStartMonth?: string;
  readonly forecastEndMonth?: string;
  readonly actualStartMonth?: string;
  readonly actualEndMonth?: string;
}

export interface UnifiedCalculationRequest {
  readonly calculationTypes: readonly ('historical' | 'forecast' | 'budget')[];
  readonly includeIntermediateNodes: boolean;
}

// NEW: Updated visualization types using MM-YYYY format (Phase 5)
export interface NodeVisualizationValue {
  readonly nodeId: string;
  readonly month: string; // MM-YYYY format
  readonly value: number | null;
  readonly valueType: 'forecast' | 'budget' | 'historical' | 'constant' | 'calculated';
  readonly formattedValue: string;
}

// NEW: Updated merged time series with MM-YYYY format (Phase 5)
export interface MergedTimeSeriesValue {
  readonly month: string; // MM-YYYY format
  readonly forecast: number | null; // Forecast value (null during actual period)
  readonly budget: number | null; // Budget value (null during actual period)
  readonly historical: number | null; // Historical value (null during forecast period)
  readonly calculated: number | null; // Calculated value (for non-metric nodes)
  readonly isPeriodActual: boolean; // True if this month is in the actual period
  readonly formattedForecast: string; // Formatted forecast value
  readonly formattedBudget: string; // Formatted budget value
  readonly formattedHistorical: string; // Formatted historical value
  readonly formattedCalculated: string; // Formatted calculated value
}

export interface MergedTimeSeriesData {
  readonly nodeId: string;
  readonly nodeType: import('@/lib/store/forecast-graph-store').ForecastNodeKind;
  readonly values: MergedTimeSeriesValue[];
  readonly actualPeriodStart: string; // MM-YYYY format
  readonly actualPeriodEnd: string; // MM-YYYY format
  readonly forecastPeriodStart: string; // MM-YYYY format
  readonly forecastPeriodEnd: string; // MM-YYYY format
}

// ============================================================================
// LEGACY TYPES REMOVED - Phase 8 Cleanup
// ============================================================================
// All deprecated legacy types have been removed as part of Phase 8 implementation.
// Use UnifiedCalculationResult, UnifiedNodeResult, and UnifiedMonthlyValue instead.

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

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

// Graph validation types
export interface GraphValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// ============================================================================
// HISTORICAL CALCULATION TYPES (Updated for Phase 5)
// ============================================================================

// NEW: Historical calculation request using MM-YYYY periods
export interface HistoricalCalculationRequest {
  readonly actualStartMonth: string; // MM-YYYY format
  readonly actualEndMonth: string; // MM-YYYY format
}

// NEW: Actual period management with MM-YYYY format
export interface ActualPeriod {
  readonly startMonth: string; // MM-YYYY format
  readonly endMonth: string; // MM-YYYY format
}

export interface ActualPeriodValidation {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly conflictsWithForecastPeriod: boolean;
  readonly suggestedPeriod?: ActualPeriod;
}

// NEW: Historical calculation state with MM-YYYY format
export interface HistoricalCalculationState {
  readonly isCalculating: boolean;
  readonly results: UnifiedCalculationResult | null; // Updated to use unified type
  readonly error: string | null;
  readonly lastCalculatedAt: Date | null;
  readonly actualPeriod: ActualPeriod | null;
}

// NEW: Enhanced period configuration with MM-YYYY format
export interface PeriodConfiguration {
  readonly forecastPeriod: {
    readonly startMonth: string; // MM-YYYY format
    readonly endMonth: string; // MM-YYYY format
  } | null;
  readonly actualPeriod: ActualPeriod | null;
  readonly isValidConfiguration: boolean;
  readonly configurationErrors: readonly string[];
}

// ============================================================================
// DEPRECATED LEGACY TYPES REMOVED - Phase 8 Cleanup
// ============================================================================
// All deprecated legacy types have been removed as part of Phase 8 implementation.
// Use UnifiedCalculationResult with MM-YYYY periods and PeriodConfiguration instead. 