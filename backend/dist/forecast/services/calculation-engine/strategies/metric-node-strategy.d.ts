import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { CalculationTreeNode, CalculationType, CalculationContext } from '../types/calculation-types';
import { VariableDataService } from '../variable-data-service';
import { PeriodService } from '../services/period-service';
export declare class MetricNodeStrategy implements NodeEvaluationStrategy {
    private readonly variableDataService;
    private readonly periodService;
    constructor(variableDataService: VariableDataService, periodService: PeriodService);
    getNodeType(): string;
    evaluate(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext): Promise<number | null>;
    validateNode(node: CalculationTreeNode): {
        isValid: boolean;
        errors: string[];
    };
    private evaluateFromCalculation;
    private evaluateFromVariable;
    private getNodeEvaluator;
}
