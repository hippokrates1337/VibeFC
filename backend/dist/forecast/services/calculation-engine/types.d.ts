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
export interface MetricCalculationResult {
    readonly metricNodeId: string;
    readonly values: MonthlyForecastValue[];
}
export interface ForecastCalculationResult {
    readonly forecastId: string;
    readonly calculatedAt: Date;
    readonly metrics: MetricCalculationResult[];
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
    variableId: string;
    offsetMonths: number;
}
export interface ConstantNodeAttributes {
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
