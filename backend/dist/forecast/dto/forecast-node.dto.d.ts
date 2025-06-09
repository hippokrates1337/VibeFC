export declare enum ForecastNodeKind {
    DATA = "DATA",
    CONSTANT = "CONSTANT",
    OPERATOR = "OPERATOR",
    METRIC = "METRIC",
    SEED = "SEED"
}
export interface NodePosition {
    x: number;
    y: number;
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
export declare class CreateForecastNodeDto {
    forecastId: string;
    kind: ForecastNodeKind;
    attributes: NodeAttributes;
    position: NodePosition;
}
export declare class UpdateForecastNodeDto {
    kind?: ForecastNodeKind;
    attributes?: NodeAttributes;
    position?: NodePosition;
}
export declare class ForecastNodeDto {
    id: string;
    forecastId: string;
    kind: ForecastNodeKind;
    attributes: NodeAttributes;
    position: NodePosition;
    createdAt: Date;
    updatedAt: Date;
}
