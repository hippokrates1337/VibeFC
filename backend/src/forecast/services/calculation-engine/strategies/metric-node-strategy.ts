/**
 * Metric Node Strategy - Phase 2.2
 * Handles evaluation of METRIC nodes
 */

import { Injectable } from '@nestjs/common';
import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { 
  CalculationTreeNode, 
  CalculationType, 
  CalculationContext,
  MetricNodeAttributes
} from '../types/calculation-types';
import { VariableDataService } from '../variable-data-service';
import { PeriodService } from '../services/period-service';

@Injectable()
export class MetricNodeStrategy implements NodeEvaluationStrategy {
  
  constructor(
    private readonly variableDataService: VariableDataService,
    private readonly periodService: PeriodService
  ) {}

  getNodeType(): string {
    return 'METRIC';
  }

  async evaluate(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    const attributes = node.nodeData as MetricNodeAttributes;
    
    if (!attributes) {
      context.logger.error(`[MetricNodeStrategy] Missing attributes for METRIC node ${node.nodeId}`);
      return null;
    }

    // Check cache first
    const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
    const cachedValue = context.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      context.logger.log(`[MetricNodeStrategy] Cache hit for METRIC node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
      return cachedValue;
    }

    try {
      context.logger.log(`[MetricNodeStrategy] Evaluating METRIC node ${node.nodeId} for month ${month}, type: ${calculationType}, useCalculated: ${attributes.useCalculated}`);

      let result: number | null = null;

      // Forecast values are ALWAYS calculated from children, regardless of useCalculated flag
      if (calculationType === 'forecast') {
        context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Using calculated forecast from child (always calculated)`);
        result = await this.evaluateFromCalculation(node, month, calculationType, context);
        context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Child returned forecast value: ${result}`);
      } else {
        // For historical and budget calculations, respect the useCalculated flag
        if (attributes.useCalculated) {
          // Use calculated value from child node
          context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Using calculated ${calculationType} from child (useCalculated=true)`);
          result = await this.evaluateFromCalculation(node, month, calculationType, context);
        } else {
          // Use direct variable reference based on calculation type
          context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Using variable ${calculationType} (useCalculated=false)`);
          result = await this.evaluateFromVariable(node, month, calculationType, context, attributes);
        }
      }

      context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId} (${calculationType}) result: ${result} for month ${month}`);

      // Cache the result
      context.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      context.logger.error(`[MetricNodeStrategy] Error evaluating METRIC node ${node.nodeId}:`, error);
      const result = null;
      context.cache.set(cacheKey, result);
      return result;
    }
  }

  validateNode(node: CalculationTreeNode): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (node.nodeType !== 'METRIC') {
      errors.push(`Expected METRIC node, got ${node.nodeType}`);
    }

    const attributes = node.nodeData as MetricNodeAttributes;
    if (!attributes) {
      errors.push('Missing node attributes');
      return { isValid: false, errors };
    }

    // METRIC nodes must have exactly one child for forecast calculations (always calculated)
    // This is required regardless of useCalculated flag since forecasts are always calculated
    if (!node.children || node.children.length !== 1) {
      errors.push('METRIC nodes must have exactly one child for forecast calculations');
    }

    // For useCalculated=true, the child is used for all calculation types
    // For useCalculated=false, the child is used for forecast, variables for historical/budget
    if (!attributes.useCalculated) {
      if (!attributes.budgetVariableId && !attributes.historicalVariableId) {
        errors.push('METRIC nodes with useCalculated=false must have budgetVariableId and/or historicalVariableId for historical/budget calculations');
      }
    }

    if (typeof attributes.useCalculated !== 'boolean') {
      errors.push('useCalculated must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async evaluateFromCalculation(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    if (!node.children || node.children.length !== 1) {
      context.logger.error(`[MetricNodeStrategy] METRIC node ${node.nodeId} must have exactly one child for calculation, but has ${node.children?.length || 0}`);
      return null;
    }

    // Get NodeEvaluator from context to evaluate child
    const nodeEvaluator = this.getNodeEvaluator(context);
    const child = node.children[0];
    
    context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Evaluating child ${child.nodeId} (${child.nodeType}) for ${calculationType} calculation`);
    const result = await nodeEvaluator.evaluate(child, month, calculationType, context);
    context.logger.log(`[MetricNodeStrategy] METRIC node ${node.nodeId}: Child ${child.nodeId} returned: ${result}`);

    return result;
  }

  private async evaluateFromVariable(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext,
    attributes: MetricNodeAttributes
  ): Promise<number | null> {
    let variableId: string | null = null;

    // Select variable based on calculation type
    // Note: forecast calculations should never reach this method as they're always calculated
    switch (calculationType) {
      case 'historical':
        variableId = attributes.historicalVariableId;
        if (!variableId) {
          context.logger.warn(`[MetricNodeStrategy] No historicalVariableId for METRIC node ${node.nodeId} in historical calculation`);
          return null;
        }
        break;

      case 'budget':
        variableId = attributes.budgetVariableId;
        if (!variableId) {
          context.logger.warn(`[MetricNodeStrategy] No budgetVariableId for METRIC node ${node.nodeId} in budget calculation`);
          return null;
        }
        break;

      case 'forecast':
        // Forecast calculations should never use direct variables - they're always calculated
        context.logger.error(`[MetricNodeStrategy] Forecast calculations should never use direct variables for METRIC node ${node.nodeId}`);
        return null;

      default:
        context.logger.error(`[MetricNodeStrategy] Unknown calculation type: ${calculationType}`);
        return null;
    }

    // Get value from variable
    try {
      const targetDate = this.periodService.mmyyyyToFirstOfMonth(month);
      const value = await this.variableDataService.getVariableValue(
        variableId,
        targetDate,
        context.variables
      );

      return value;
    } catch (error) {
      context.logger.warn(`[MetricNodeStrategy] Failed to get variable value for ${variableId} at ${month}:`, error);
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
