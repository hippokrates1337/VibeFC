/**
 * Node Evaluation Strategy Interface - Phase 2.1
 * Strategy pattern interface for node evaluation
 */

import { 
  CalculationTreeNode, 
  CalculationType, 
  CalculationContext 
} from '../types/calculation-types';

/**
 * Strategy interface for evaluating different node types
 * Each node type (DATA, CONSTANT, OPERATOR, METRIC, SEED) implements this interface
 */
export interface NodeEvaluationStrategy {
  /**
   * Evaluate a node for a specific month and calculation type
   * 
   * @param node - The calculation tree node to evaluate
   * @param month - The target month in MM-YYYY format
   * @param calculationType - The type of calculation (historical, forecast, budget)
   * @param context - The calculation context containing variables, cache, etc.
   * @returns Promise resolving to the calculated value or null
   */
  evaluate(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null>;

  /**
   * Get the node type that this strategy handles
   * Used for strategy registration and validation
   */
  getNodeType(): string;

  /**
   * Validate that a node can be processed by this strategy
   * 
   * @param node - The node to validate
   * @returns Validation result with any errors
   */
  validateNode(node: CalculationTreeNode): {
    isValid: boolean;
    errors: string[];
  };
}
