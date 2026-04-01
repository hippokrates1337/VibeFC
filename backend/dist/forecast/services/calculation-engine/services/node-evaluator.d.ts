import { CalculationTreeNode, CalculationType, CalculationContext } from '../types/calculation-types';
import { DataNodeStrategy } from '../strategies/data-node-strategy';
import { ConstantNodeStrategy } from '../strategies/constant-node-strategy';
import { OperatorNodeStrategy } from '../strategies/operator-node-strategy';
import { MetricNodeStrategy } from '../strategies/metric-node-strategy';
import { SeedNodeStrategy } from '../strategies/seed-node-strategy';
export declare class NodeEvaluator {
    private readonly dataNodeStrategy;
    private readonly constantNodeStrategy;
    private readonly operatorNodeStrategy;
    private readonly metricNodeStrategy;
    private readonly seedNodeStrategy;
    private readonly logger;
    private strategies;
    constructor(dataNodeStrategy: DataNodeStrategy, constantNodeStrategy: ConstantNodeStrategy, operatorNodeStrategy: OperatorNodeStrategy, metricNodeStrategy: MetricNodeStrategy, seedNodeStrategy: SeedNodeStrategy, logger: any);
    evaluate(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext): Promise<number | null>;
    validateNode(node: CalculationTreeNode): {
        isValid: boolean;
        errors: string[];
    };
    validateNodes(nodes: CalculationTreeNode[]): {
        isValid: boolean;
        errors: string[];
    };
    getSupportedNodeTypes(): string[];
    isNodeTypeSupported(nodeType: string): boolean;
    private registerStrategy;
    evaluateParallel(evaluations: {
        node: CalculationTreeNode;
        month: string;
        calculationType: CalculationType;
        context: CalculationContext;
    }[]): Promise<(number | null)[]>;
    evaluateTree(node: CalculationTreeNode, month: string, calculationType: CalculationType, context: CalculationContext, visited?: Set<string>): Promise<number | null>;
    getEvaluationStats(): {
        strategiesRegistered: number;
        supportedNodeTypes: string[];
    };
    clearCaches(): void;
}
