import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { CalculationTreeNode, CalculationType, CalculationContext } from '../types/calculation-types';
export declare class ConstantNodeStrategy implements NodeEvaluationStrategy {
    getNodeType(): string;
    evaluate(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext): Promise<number | null>;
    validateNode(node: CalculationTreeNode): {
        isValid: boolean;
        errors: string[];
    };
}
