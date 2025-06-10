import type { Variable, CalculationTree, ForecastCalculationResult } from './types';
import { VariableDataService } from './variable-data-service';
interface ICalculationEngineService {
    calculateForecast(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ForecastCalculationResult>;
}
export declare class CalculationEngine implements ICalculationEngineService {
    private readonly variableDataService;
    private readonly logger;
    constructor(variableDataService: VariableDataService);
    calculateForecast(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ForecastCalculationResult>;
    private calculateMetricTree;
    private evaluateNode;
    private evaluateDataNode;
    private evaluateConstantNode;
    private evaluateOperatorNode;
    private evaluateMetricNode;
    private evaluateSeedNode;
    private orderChildrenByInputOrder;
    private getMonthsBetween;
    private addMonths;
    private normalizeToFirstOfMonth;
    private orderTreesByDependencies;
    private analyzeCrossTreeDependencies;
    private findSeedNodesInTree;
    private topologicalSortTrees;
}
export {};
