import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { CalculationTreeNode, CalculationType, CalculationContext } from '../types/calculation-types';
import { PeriodService } from '../services/period-service';
import { VariableDataService } from '../variable-data-service';
export declare class SeedNodeStrategy implements NodeEvaluationStrategy {
    private readonly periodService;
    private readonly variableDataService;
    constructor(periodService: PeriodService, variableDataService: VariableDataService);
    getNodeType(): string;
    evaluate(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext): Promise<number | null>;
    validateNode(node: CalculationTreeNode): {
        isValid: boolean;
        errors: string[];
    };
    private isFirstMonthInPeriod;
    private getSameMonthHistoricalValueFromSourceMetric;
    private getHistoricalValueFromSourceMetric;
    private getPreviousMonthValueFromSourceMetric;
    private findSourceMetricNode;
    private searchNodeInTree;
}
