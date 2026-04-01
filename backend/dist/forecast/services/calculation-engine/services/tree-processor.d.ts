import { CalculationTree, CalculationTreeNode } from '../types/calculation-types';
export declare class TreeProcessor {
    orderByDependencies(trees: CalculationTree[]): CalculationTree[];
    flattenToNodes(tree: CalculationTree): CalculationTreeNode[];
    flattenForIntermediateResults(tree: CalculationTree): CalculationTreeNode[];
    flattenAllTrees(trees: CalculationTree[]): CalculationTreeNode[];
    private findSeedDependencies;
    validateTree(tree: CalculationTree): {
        isValid: boolean;
        errors: string[];
    };
    private validateNodeConstraints;
    getMetricNodeIds(trees: CalculationTree[]): string[];
    findTreeContainingNode(trees: CalculationTree[], nodeId: string): CalculationTree | null;
    private treeContainsNode;
}
