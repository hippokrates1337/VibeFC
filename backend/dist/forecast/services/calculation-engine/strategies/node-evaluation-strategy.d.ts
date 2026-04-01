import { CalculationTreeNode, CalculationType, CalculationContext } from '../types/calculation-types';
export interface NodeEvaluationStrategy {
    evaluate(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext): Promise<number | null>;
    getNodeType(): string;
    validateNode(node: CalculationTreeNode): {
        isValid: boolean;
        errors: string[];
    };
}
