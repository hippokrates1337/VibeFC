import { CalculationResult, CalculationRequest, NodeResult } from '../types/calculation-types';
export declare class ResultBuilder {
    build(nodeResults: Map<string, NodeResult>, request: CalculationRequest): CalculationResult;
    private separateNodeTypes;
    private buildPeriodInfo;
    filterMetrics(nodeResults: NodeResult[], metricNodeIds: string[]): NodeResult[];
    getResultSummary(result: CalculationResult): {
        totalNodes: number;
        metricCount: number;
        intermediateNodeCount: number;
        monthCount: number;
        calculationTypes: string[];
    };
    validateResult(result: CalculationResult): {
        isValid: boolean;
        errors: string[];
    };
    private validateNodeResult;
    mergeResults(results: CalculationResult[]): CalculationResult;
}
