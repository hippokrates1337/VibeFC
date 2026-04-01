/**
 * Data Node Strategy - Phase 2.2
 * Handles evaluation of DATA nodes
 */

import { Injectable } from '@nestjs/common';
import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { 
  CalculationTreeNode, 
  CalculationType, 
  CalculationContext,
  DataNodeAttributes
} from '../types/calculation-types';
import { VariableDataService } from '../variable-data-service';
import { PeriodService } from '../services/period-service';

@Injectable()
export class DataNodeStrategy implements NodeEvaluationStrategy {
  
  constructor(
    private readonly variableDataService: VariableDataService,
    private readonly periodService: PeriodService
  ) {}

  getNodeType(): string {
    return 'DATA';
  }

  async evaluate(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    const attributes = node.nodeData as DataNodeAttributes;
    
    if (!attributes || !attributes.variableId) {
      context.logger.error(`[DataNodeStrategy] Missing variableId for DATA node ${node.nodeId}`);
      return null;
    }

    // Check cache first
    const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
    const cachedValue = context.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      context.logger.log(`[DataNodeStrategy] Cache hit for DATA node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
      return cachedValue;
    }

    try {
      // Calculate target month with offset
      const targetMonth = attributes.offsetMonths 
        ? this.periodService.addMonths(month, attributes.offsetMonths)
        : month;

      context.logger.log(`[DataNodeStrategy] Evaluating DATA node ${node.nodeId} for month ${month} (target: ${targetMonth}), type: ${calculationType}, offset: ${attributes.offsetMonths}`);

      // Find the variable
      const variable = context.variables.find(v => v.id === attributes.variableId);
      if (!variable) {
        context.logger.warn(`[DataNodeStrategy] Variable ${attributes.variableId} not found for DATA node ${node.nodeId}`);
        const result = null;
        context.cache.set(cacheKey, result);
        return result;
      }

      // Get value based on calculation type
      let result: number | null = null;

      switch (calculationType) {
        case 'historical':
          // For historical calculations, only use ACTUAL or UNKNOWN variables
          if (variable.type === 'ACTUAL' || variable.type === 'UNKNOWN') {
            result = await this.getVariableValueOrZeroWhenMissing(
              variable.id,
              targetMonth,
              calculationType,
              node.nodeId,
              context
            );
          } else {
            // BUDGET and INPUT variables are not used for historical calculations
            result = null;
          }
          break;

        case 'forecast':
          // For forecast calculations, only use INPUT or UNKNOWN variables
          if (variable.type === 'INPUT' || variable.type === 'UNKNOWN') {
            result = await this.getVariableValueOrZeroWhenMissing(
              variable.id,
              targetMonth,
              calculationType,
              node.nodeId,
              context
            );
          } else {
            // ACTUAL and BUDGET variables are not used for forecast calculations
            result = null;
          }
          break;

        case 'budget':
          // For budget calculations, only use BUDGET variables
          if (variable.type === 'BUDGET') {
            result = await this.getVariableValueOrZeroWhenMissing(
              variable.id,
              targetMonth,
              calculationType,
              node.nodeId,
              context
            );
          } else {
            // ACTUAL, INPUT, and UNKNOWN variables are not used for budget calculations
            result = null;
          }
          break;

        default:
          context.logger.error(`[DataNodeStrategy] Unknown calculation type: ${calculationType}`);
          result = null;
      }

      context.logger.log(`[DataNodeStrategy] DATA node ${node.nodeId} (${calculationType}) result: ${result} for month ${targetMonth}`);
      
      // Cache the result
      context.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      context.logger.error(`[DataNodeStrategy] Error evaluating DATA node ${node.nodeId}:`, error);
      const result = null;
      context.cache.set(cacheKey, result);
      return result;
    }
  }

  validateNode(node: CalculationTreeNode): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (node.nodeType !== 'DATA') {
      errors.push(`Expected DATA node, got ${node.nodeType}`);
    }

    const attributes = node.nodeData as DataNodeAttributes;
    if (!attributes) {
      errors.push('Missing node attributes');
      return { isValid: false, errors };
    }

    if (!attributes.variableId) {
      errors.push('Missing variableId in DATA node attributes');
    }

    if (typeof attributes.offsetMonths !== 'number') {
      errors.push('offsetMonths must be a number');
    }

    // DATA nodes should not have children
    if (node.children && node.children.length > 0) {
      errors.push('DATA nodes should not have children');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async getVariableValue(
    variableId: string, 
    month: string, 
    context: CalculationContext
  ): Promise<number | null> {
    try {
      // Convert MM-YYYY to first of month date
      const targetDate = this.periodService.mmyyyyToFirstOfMonth(month);
      
      // Use existing variable data service to get the value
      const value = await this.variableDataService.getVariableValue(
        variableId,
        targetDate,
        context.variables
      );

      return value;
    } catch (error) {
      context.logger.warn(`[DataNodeStrategy] Failed to get variable value for ${variableId} at ${month}:`, error);
      return null;
    }
  }

  /**
   * Missing values for a month (no row / null in intake) would propagate null through
   * OPERATOR chains and null the whole METRIC forecast. Use 0 so multiplication/add
   * can still produce a defined result when other operands exist.
   */
  private async getVariableValueOrZeroWhenMissing(
    variableId: string,
    targetMonth: string,
    calculationType: CalculationType,
    dataNodeId: string,
    context: CalculationContext
  ): Promise<number> {
    const raw = await this.getVariableValue(variableId, targetMonth, context);
    if (raw === null) {
      context.logger.log(
        `[DataNodeStrategy] No value for variable ${variableId} at ${targetMonth} (${calculationType}), DATA ${dataNodeId} — using 0 fallback`
      );
      return 0;
    }
    return raw;
  }
}
