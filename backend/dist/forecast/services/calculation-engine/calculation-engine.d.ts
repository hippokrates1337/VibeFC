import type { Variable, CalculationTree, ForecastCalculationResult, ExtendedForecastCalculationResult } from './types';
import { VariableDataService } from './variable-data-service';
interface ICalculationEngineService {
    calculateForecast(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ForecastCalculationResult>;
    calculateForecastExtended(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ExtendedForecastCalculationResult>;
}
export declare class CalculationEngine implements ICalculationEngineService {
    private readonly variableDataService;
    private readonly logger;
    constructor(variableDataService: VariableDataService);
    calculateForecast(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ForecastCalculationResult>;
    calculateForecastExtended(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ExtendedForecastCalculationResult>;
    private calculateMetricTree;
    private calculateMetricTreeExtended;
    private evaluateNode;
    private evaluateDataNode;
    private evaluateConstantNode;
    private evaluateOperatorNode;
    private evaluateMetricNode;
    private evaluateSeedNode;
    private evaluateNodeExtended;
    private storeNodeCalculationResult;
    private evaluateOperatorNodeExtended;
    private evaluateDataNodeExtended;
    private evaluateConstantNodeExtended;
    private evaluateMetricNodeExtended;
    private evaluateSeedNodeExtended;
    private collectAllNodeResults;
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
