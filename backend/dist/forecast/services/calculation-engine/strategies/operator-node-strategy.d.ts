import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { PeriodService } from '../services/period-service';
import { CalculationTreeNode, CalculationType, CalculationContext } from '../types/calculation-types';
export declare class OperatorNodeStrategy implements NodeEvaluationStrategy {
    private readonly periodService;
    constructor(periodService: PeriodService);
    getNodeType(): string;
    evaluate(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext): Promise<number | null>;
    private evaluateOffset;
    private normalizeOffsetMonths;
    validateNode(node: CalculationTreeNode): {
        isValid: boolean;
        errors: string[];
    };
    private performOperation;
    private getNodeEvaluator;
}
