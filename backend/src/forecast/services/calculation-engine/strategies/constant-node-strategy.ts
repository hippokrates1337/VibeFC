/**
 * Constant Node Strategy - Phase 2.2
 * Handles evaluation of CONSTANT nodes
 */

import { Injectable } from '@nestjs/common';
import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { 
  CalculationTreeNode, 
  CalculationType, 
  CalculationContext,
  ConstantNodeAttributes
} from '../types/calculation-types';

@Injectable()
export class ConstantNodeStrategy implements NodeEvaluationStrategy {
  
  getNodeType(): string {
    return 'CONSTANT';
  }

  async evaluate(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    const attributes = node.nodeData as ConstantNodeAttributes;
    
    if (!attributes || typeof attributes.value !== 'number') {
      context.logger.error(`[ConstantNodeStrategy] Missing or invalid value for CONSTANT node ${node.nodeId}`);
      return null;
    }

    // Check cache first (though constants don't really need caching)
    const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
    const cachedValue = context.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Constants return the same value regardless of month or calculation type
    const result = attributes.value;
    
    context.logger.log(`[ConstantNodeStrategy] CONSTANT node ${node.nodeId} (${calculationType}) result: ${result} for month ${month}`);
    
    // Cache the result
    context.cache.set(cacheKey, result);
    return result;
  }

  validateNode(node: CalculationTreeNode): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (node.nodeType !== 'CONSTANT') {
      errors.push(`Expected CONSTANT node, got ${node.nodeType}`);
    }

    const attributes = node.nodeData as ConstantNodeAttributes;
    if (!attributes) {
      errors.push('Missing node attributes');
      return { isValid: false, errors };
    }

    if (typeof attributes.value !== 'number') {
      errors.push('CONSTANT node value must be a number');
    }

    if (isNaN(attributes.value) || !isFinite(attributes.value)) {
      errors.push('CONSTANT node value must be a finite number');
    }

    // CONSTANT nodes should not have children
    if (node.children && node.children.length > 0) {
      errors.push('CONSTANT nodes should not have children');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
