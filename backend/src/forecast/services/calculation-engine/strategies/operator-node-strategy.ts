/**
 * Operator Node Strategy - Phase 2.2
 * Handles evaluation of OPERATOR nodes
 */

import { Injectable } from '@nestjs/common';
import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { 
  CalculationTreeNode, 
  CalculationType, 
  CalculationContext,
  OperatorNodeAttributes
} from '../types/calculation-types';

@Injectable()
export class OperatorNodeStrategy implements NodeEvaluationStrategy {
  
  getNodeType(): string {
    return 'OPERATOR';
  }

  async evaluate(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    const attributes = node.nodeData as OperatorNodeAttributes;
    
    if (!attributes || !attributes.op) {
      context.logger.error(`[OperatorNodeStrategy] Missing operator for OPERATOR node ${node.nodeId}`);
      return null;
    }

    // Check cache first
    const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
    const cachedValue = context.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      context.logger.log(`[OperatorNodeStrategy] Cache hit for OPERATOR node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
      return cachedValue;
    }

    try {
      context.logger.log(`[OperatorNodeStrategy] Evaluating OPERATOR node ${node.nodeId} (${attributes.op}) for month ${month}, type: ${calculationType}`);

      if (!node.children || node.children.length === 0) {
        context.logger.error(`[OperatorNodeStrategy] OPERATOR node ${node.nodeId} has no children`);
        const result = null;
        context.cache.set(cacheKey, result);
        return result;
      }

      // Get NodeEvaluator from context to evaluate children
      // We'll need to inject this or get it from a service locator
      const nodeEvaluator = this.getNodeEvaluator(context);
      
      // Evaluate children in the specified input order
      const childValues: number[] = [];
      const childOrder = attributes.inputOrder || node.children.map(child => child.nodeId);

      for (const childId of childOrder) {
        const child = node.children.find(c => c.nodeId === childId);
        if (!child) {
          context.logger.warn(`[OperatorNodeStrategy] Child node ${childId} not found in OPERATOR node ${node.nodeId}`);
          continue;
        }

        const childValue = await nodeEvaluator.evaluate(child, month, calculationType, context);
        
        if (childValue === null) {
          context.logger.warn(`[OperatorNodeStrategy] Child node ${childId} returned null value for OPERATOR node ${node.nodeId}`);
          // For operations, if any child is null, the result is null
          const result = null;
          context.cache.set(cacheKey, result);
          return result;
        }

        childValues.push(childValue);
      }

      if (childValues.length === 0) {
        context.logger.error(`[OperatorNodeStrategy] No valid child values for OPERATOR node ${node.nodeId}`);
        const result = null;
        context.cache.set(cacheKey, result);
        return result;
      }

      // Perform the operation
      const result = this.performOperation(attributes.op, childValues);
      
      context.logger.log(`[OperatorNodeStrategy] OPERATOR node ${node.nodeId} (${attributes.op}) result: ${result} for month ${month}`);
      
      // Cache the result
      context.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      context.logger.error(`[OperatorNodeStrategy] Error evaluating OPERATOR node ${node.nodeId}:`, error);
      const result = null;
      context.cache.set(cacheKey, result);
      return result;
    }
  }

  validateNode(node: CalculationTreeNode): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (node.nodeType !== 'OPERATOR') {
      errors.push(`Expected OPERATOR node, got ${node.nodeType}`);
    }

    const attributes = node.nodeData as OperatorNodeAttributes;
    if (!attributes) {
      errors.push('Missing node attributes');
      return { isValid: false, errors };
    }

    const validOperators = ['+', '-', '*', '/', '^'];
    if (!attributes.op || !validOperators.includes(attributes.op)) {
      errors.push(`Invalid operator: ${attributes.op}. Valid operators are: ${validOperators.join(', ')}`);
    }

    // OPERATOR nodes must have children
    if (!node.children || node.children.length === 0) {
      errors.push('OPERATOR nodes must have at least one child');
    }

    // Validate input order if specified
    if (attributes.inputOrder) {
      if (!Array.isArray(attributes.inputOrder)) {
        errors.push('inputOrder must be an array');
      } else {
        const childIds = new Set(node.children?.map(c => c.nodeId) || []);
        const orderIds = new Set(attributes.inputOrder);
        
        // Check that all order IDs exist as children
        for (const orderId of attributes.inputOrder) {
          if (!childIds.has(orderId)) {
            errors.push(`inputOrder references non-existent child: ${orderId}`);
          }
        }

        // Warn if not all children are in the order (they'll be ignored)
        for (const childId of childIds) {
          if (!orderIds.has(childId)) {
            // This is a warning, not an error
            // errors.push(`Child ${childId} not included in inputOrder`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private performOperation(operator: string, values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    try {
      switch (operator) {
        case '+':
          return values.reduce((sum, val) => sum + val, 0);

        case '-':
          if (values.length === 1) {
            return -values[0]; // Unary minus
          }
          return values.reduce((diff, val, index) => index === 0 ? val : diff - val);

        case '*':
          return values.reduce((product, val) => product * val, 1);

        case '/':
          if (values.length === 1) {
            return 1 / values[0]; // Reciprocal
          }
          return values.reduce((quotient, val, index) => {
            if (index === 0) return val;
            if (val === 0) throw new Error('Division by zero');
            return quotient / val;
          });

        case '^':
          if (values.length !== 2) {
            throw new Error('Power operation requires exactly 2 operands');
          }
          return Math.pow(values[0], values[1]);

        default:
          throw new Error(`Unknown operator: ${operator}`);
      }
    } catch (error) {
      console.error(`[OperatorNodeStrategy] Operation error:`, error);
      return null;
    }
  }

  // This is a temporary solution - in the full implementation, we'd inject NodeEvaluator properly
  private getNodeEvaluator(context: CalculationContext): any {
    // For now, we'll assume the NodeEvaluator is available in the context
    // In the real implementation, this would be injected or available through a service locator
    return (context as any).nodeEvaluator;
  }
}
