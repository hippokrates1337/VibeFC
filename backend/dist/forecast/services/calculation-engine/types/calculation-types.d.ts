import type { Variable } from '../types';
export type { Variable };
export type CalculationType = 'historical' | 'forecast' | 'budget';
export type NodeType = 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
export interface CalculationRequest {
    readonly trees: CalculationTree[];
    readonly periods: {
        readonly forecast: {
            start: string;
            end: string;
        };
        readonly actual: {
            start: string;
            end: string;
        };
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
    readonly forecastStartMonth: string;
    readonly forecastEndMonth: string;
    readonly actualStartMonth: string;
    readonly actualEndMonth: string;
}
export interface NodeResult {
    readonly nodeId: string;
    readonly nodeType: NodeType;
    readonly nodeData?: unknown;
    readonly values: MonthlyValue[];
}
export interface MonthlyValue {
    month: string;
    historical: number | null;
    forecast: number | null;
    budget: number | null;
    calculated: number | null;
}
export interface CalculationTree {
    readonly rootMetricNodeId: string;
    readonly tree: CalculationTreeNode;
}
export interface CalculationTreeNode {
    readonly nodeId: string;
    readonly nodeType: NodeType;
    readonly nodeData: unknown;
    readonly children: CalculationTreeNode[];
    readonly inputOrder?: readonly string[];
    isReference?: boolean;
}
export interface CalculationContext {
    readonly variables: Variable[];
    readonly periods: PeriodConfiguration;
    readonly cache: CalculationCache;
    readonly nodeResults: Map<string, NodeResult>;
    readonly request: CalculationRequest;
    readonly logger: Logger;
    runningMetricForecasts: Map<string, Map<string, number | null>>;
}
export interface PeriodConfiguration {
    readonly forecastMonths: string[];
    readonly actualMonths: string[];
    readonly allMonths: string[];
}
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
export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
}
export interface NodeEvaluationStrategy {
    evaluate(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext): Promise<number | null>;
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
    op: '+' | '-' | '*' | '/' | '^' | 'offset';
    inputOrder: string[];
    offsetMonths?: number;
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
export declare class CalculationError extends Error {
    readonly errors: string[];
    readonly nodeId?: string | undefined;
    readonly calculationType?: CalculationType | undefined;
    constructor(message: string, errors?: string[], nodeId?: string | undefined, calculationType?: CalculationType | undefined);
}
export declare class ValidationError extends Error {
    readonly validationErrors: string[];
    constructor(message: string, validationErrors: string[]);
}
export interface MonthUtility {
    isValidMMYYYY(month: string): boolean;
    compareMonths(month1: string, month2: string): number;
    getMonthsBetween(startMonth: string, endMonth: string): string[];
    addMonths(month: string, monthsToAdd: number): string;
    subtractMonths(month: string, monthsToSubtract: number): string;
    dateToMMYYYY(date: Date): string;
    mmyyyyToFirstOfMonth(month: string): Date;
}
