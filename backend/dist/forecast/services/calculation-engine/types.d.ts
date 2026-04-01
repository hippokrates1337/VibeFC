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
export interface ForecastNodeClient {
    id: string;
    type: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
    data: unknown;
    position: {
        x: number;
        y: number;
    };
}
export interface ForecastEdgeClient {
    id: string;
    source: string;
    target: string;
}
export interface MonthlyForecastValue {
    readonly date: Date;
    readonly forecast: number | null;
    readonly budget: number | null;
    readonly historical: number | null;
}
export interface MonthlyNodeValue extends MonthlyForecastValue {
    readonly calculated: number | null;
}
export interface MetricCalculationResult {
    readonly metricNodeId: string;
    readonly values: MonthlyForecastValue[];
}
export interface NodeCalculationResult {
    readonly nodeId: string;
    readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
    readonly nodeData?: unknown;
    readonly values: MonthlyNodeValue[];
}
export interface ForecastCalculationResult {
    readonly forecastId: string;
    readonly calculatedAt: Date;
    readonly metrics: MetricCalculationResult[];
}
export interface ExtendedForecastCalculationResult extends ForecastCalculationResult {
    readonly allNodes: NodeCalculationResult[];
}
export interface CalculationTreeNode {
    readonly nodeId: string;
    readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
    readonly nodeData: unknown;
    readonly children: CalculationTreeNode[];
    readonly inputOrder?: readonly string[];
}
export interface CalculationTree {
    readonly rootMetricNodeId: string;
    readonly tree: CalculationTreeNode;
}
export interface GraphValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
}
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
export type NodeAttributes = DataNodeAttributes | ConstantNodeAttributes | OperatorNodeAttributes | MetricNodeAttributes | SeedNodeAttributes;
export type CalculationType = 'historical' | 'forecast' | 'budget';
export interface UnifiedCalculationRequest {
    readonly calculationTypes: CalculationType[];
    readonly includeIntermediateNodes: boolean;
}
export interface UnifiedMonthlyValue {
    readonly month: string;
    readonly historical: number | null;
    readonly forecast: number | null;
    readonly budget: number | null;
    readonly calculated: number | null;
}
export interface UnifiedNodeResult {
    readonly nodeId: string;
    readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
    readonly nodeData?: unknown;
    readonly values: UnifiedMonthlyValue[];
}
export interface UnifiedCalculationResult {
    readonly forecastId: string;
    readonly calculatedAt: Date;
    readonly calculationTypes: CalculationType[];
    readonly periodInfo: {
        readonly forecastStartMonth: string;
        readonly forecastEndMonth: string;
        readonly actualStartMonth: string;
        readonly actualEndMonth: string;
    };
    readonly metrics: UnifiedNodeResult[];
    readonly allNodes: UnifiedNodeResult[];
}
export interface MMYYYYUtils {
    addMonths(month: string, monthsToAdd: number): string;
    subtractMonths(month: string, monthsToSubtract: number): string;
    compareMonths(month1: string, month2: string): number;
    isValidMMYYYY(month: string): boolean;
    getMonthsBetween(startMonth: string, endMonth: string): string[];
    dateToMMYYYY(date: Date): string;
    mmyyyyToFirstOfMonth(month: string): Date;
}
