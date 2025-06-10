import type { ForecastNodeClient, ForecastEdgeClient, CalculationTree, GraphValidationResult } from './types';
interface GraphConverterService {
    convertToTrees(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): CalculationTree[];
    validateGraph(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): GraphValidationResult;
}
export declare class GraphConverter implements GraphConverterService {
    private readonly logger;
    convertToTrees(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): CalculationTree[];
    validateGraph(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): GraphValidationResult;
    private calculateNodeInputCounts;
    private validateNodeConnections;
    private validateSeedNodeConnections;
    private validateMetricNodeConfiguration;
    private buildTreeFromMetric;
    private getNodeChildren;
    private detectCycles;
    private findMetricNodes;
    private findTopLevelMetricNodes;
}
export {};
