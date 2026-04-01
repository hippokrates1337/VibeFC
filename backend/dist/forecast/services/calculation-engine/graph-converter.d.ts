import type { ForecastNodeClient, ForecastEdgeClient, GraphValidationResult } from './types';
import type { CalculationTree } from './types/calculation-types';
interface GraphConverterService {
    convertToTrees(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): CalculationTree[];
    validateGraph(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): GraphValidationResult;
}
export declare class GraphConverter implements GraphConverterService {
    private readonly logger;
    convertToCalculationTrees(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): CalculationTree[];
    convertToTrees(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): CalculationTree[];
    validateGraph(nodes: readonly ForecastNodeClient[], edges: readonly ForecastEdgeClient[]): GraphValidationResult;
    private calculateNodeInputCounts;
    private validateNodeConnections;
    private validateSeedNodeConnections;
    private validateMetricNodeConfiguration;
    private buildTreeFromMetric;
    private buildTreeFromNode;
    private getNodeChildren;
    private detectCycles;
    private findMetricNodes;
    private findTopLevelMetricNodes;
}
export {};
