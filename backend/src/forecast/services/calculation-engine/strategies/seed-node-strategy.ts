/**
 * Seed Node Strategy - Phase 2.2
 * Handles evaluation of SEED nodes
 */

import { Injectable } from '@nestjs/common';
import { NodeEvaluationStrategy } from './node-evaluation-strategy';
import { 
  CalculationTreeNode, 
  CalculationType, 
  CalculationContext,
  SeedNodeAttributes,
  MetricNodeAttributes
} from '../types/calculation-types';
import { PeriodService } from '../services/period-service';
import { VariableDataService } from '../variable-data-service';

@Injectable()
export class SeedNodeStrategy implements NodeEvaluationStrategy {
  
  constructor(
    private readonly periodService: PeriodService,
    private readonly variableDataService: VariableDataService
  ) {}

  getNodeType(): string {
    return 'SEED';
  }

  async evaluate(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    const attributes = node.nodeData as SeedNodeAttributes;
    
    if (!attributes || !attributes.sourceMetricId) {
      context.logger.error(`[SeedNodeStrategy] Missing sourceMetricId for SEED node ${node.nodeId}`);
      return null;
    }

    // Check cache first
    const cacheKey = context.cache.generateKey(node.nodeId, month, calculationType);
    const cachedValue = context.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      context.logger.log(`[SeedNodeStrategy] Cache hit for SEED node ${node.nodeId}, month ${month}, type ${calculationType}: ${cachedValue}`);
      return cachedValue;
    }

    try {
      context.logger.log(`[SeedNodeStrategy] Evaluating SEED node ${node.nodeId} for month ${month}, type: ${calculationType}, sourceMetric: ${attributes.sourceMetricId}`);

      let result: number | null = null;

      // Forecast evaluated in a month that is actual-only (e.g. lag into last actual month):
      // use same-month historical from the source metric, not "previous month's forecast".
      const isForecastOnActualOnlyMonth =
        calculationType === 'forecast' &&
        context.periods.actualMonths.includes(month) &&
        !context.periods.forecastMonths.includes(month);

      if (isForecastOnActualOnlyMonth) {
        result = await this.getSameMonthHistoricalValueFromSourceMetric(
          attributes.sourceMetricId,
          month,
          context
        );
        context.logger.log(
          `[SeedNodeStrategy] SEED node ${node.nodeId} (${calculationType}) result: ${result} for month ${month} (forecast on actual-only month: same-month historical)`
        );
      } else {
        // SEED nodes behave differently for first month vs subsequent months
        const isFirstMonth = this.isFirstMonthInPeriod(month, calculationType, context);

        if (isFirstMonth) {
          // First month: Use historical data from connected metric (t-1)
          result = await this.getHistoricalValueFromSourceMetric(
            attributes.sourceMetricId,
            month,
            context
          );
        } else {
          // Subsequent months: Use previous month's calculated result from the metric
          const previousMonth = this.periodService.subtractMonths(month, 1);
          result = await this.getPreviousMonthValueFromSourceMetric(
            attributes.sourceMetricId,
            previousMonth,
            calculationType,
            context
          );
        }

        context.logger.log(
          `[SeedNodeStrategy] SEED node ${node.nodeId} (${calculationType}) result: ${result} for month ${month} (first month: ${isFirstMonth})`
        );
      }
      
      // Cache the result
      context.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      context.logger.error(`[SeedNodeStrategy] Error evaluating SEED node ${node.nodeId}:`, error);
      const result = null;
      context.cache.set(cacheKey, result);
      return result;
    }
  }

  validateNode(node: CalculationTreeNode): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (node.nodeType !== 'SEED') {
      errors.push(`Expected SEED node, got ${node.nodeType}`);
    }

    const attributes = node.nodeData as SeedNodeAttributes;
    if (!attributes) {
      errors.push('Missing node attributes');
      return { isValid: false, errors };
    }

    if (!attributes.sourceMetricId) {
      errors.push('SEED node must have sourceMetricId');
    }

    // SEED nodes should not have children
    if (node.children && node.children.length > 0) {
      errors.push('SEED nodes should not have children');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isFirstMonthInPeriod(
    month: string, 
    calculationType: CalculationType, 
    context: CalculationContext
  ): boolean {
    switch (calculationType) {
      case 'forecast':
        return context.periods.forecastMonths[0] === month;
      case 'historical':
        return context.periods.actualMonths[0] === month;
      case 'budget':
        // For budget calculations, we typically use the forecast period
        return context.periods.forecastMonths[0] === month;
      default:
        return false;
    }
  }

  /**
   * When `forecast` is evaluated for a month that appears only in `actualMonths` (not in
   * `forecastMonths`), read historical variable at that same calendar month — e.g. offset
   * lag into the last actual month must see actuals, not the previous month's forecast.
   */
  private async getSameMonthHistoricalValueFromSourceMetric(
    sourceMetricId: string,
    month: string,
    context: CalculationContext
  ): Promise<number | null> {
    context.logger.log(
      `[SeedNodeStrategy] Same-month historical from metric ${sourceMetricId} for ${month} (forecast on actual-only month)`
    );

    const sourceMetricNode = this.findSourceMetricNode(sourceMetricId, context);
    if (sourceMetricNode) {
      const metricAttributes = sourceMetricNode.nodeData as MetricNodeAttributes;
      if (metricAttributes?.historicalVariableId) {
        const targetDate = this.periodService.mmyyyyToFirstOfMonth(month);
        const historicalValue = await this.variableDataService.getVariableValue(
          metricAttributes.historicalVariableId,
          targetDate,
          context.variables
        );
        if (historicalValue !== null) {
          context.logger.log(
            `[SeedNodeStrategy] Found historical value ${historicalValue} for month ${month} (same-month)`
          );
          return historicalValue;
        }
        context.logger.log(
          `[SeedNodeStrategy] historicalVariableId ${metricAttributes.historicalVariableId} returned null for month ${month} (same-month)`
        );
      } else {
        context.logger.warn(`[SeedNodeStrategy] Source metric ${sourceMetricId} has no historicalVariableId`);
      }
    } else {
      context.logger.warn(
        `[SeedNodeStrategy] Could not find source metric node ${sourceMetricId} in calculation trees`
      );
    }

    const sourceNodeResult = context.nodeResults.get(sourceMetricId);
    if (sourceNodeResult) {
      const monthlyValue = sourceNodeResult.values.find((v) => v.month === month);
      if (monthlyValue && monthlyValue.historical !== null) {
        context.logger.log(
          `[SeedNodeStrategy] Fallback: calculated historical ${monthlyValue.historical} for ${month}`
        );
        return monthlyValue.historical;
      }
    }

    context.logger.warn(
      `[SeedNodeStrategy] No same-month historical data for source metric ${sourceMetricId} at ${month}`
    );
    return null;
  }

  private async getHistoricalValueFromSourceMetric(
    sourceMetricId: string,
    currentMonth: string,
    context: CalculationContext
  ): Promise<number | null> {
    // For first month, look up historical data from the source metric's historicalVariableId (t-1)
    const previousMonth = this.periodService.subtractMonths(currentMonth, 1);
    
    context.logger.log(`[SeedNodeStrategy] Looking for historical value from metric ${sourceMetricId} for month ${previousMonth} (t-1 from ${currentMonth})`);

    // First try to get the historical variable ID from the source metric node
    const sourceMetricNode = this.findSourceMetricNode(sourceMetricId, context);
    if (sourceMetricNode) {
      const metricAttributes = sourceMetricNode.nodeData as MetricNodeAttributes;
      if (metricAttributes && metricAttributes.historicalVariableId) {
        context.logger.log(`[SeedNodeStrategy] Using historicalVariableId ${metricAttributes.historicalVariableId} from source metric ${sourceMetricId}`);
        
        // Get historical value directly from the historical variable
        const targetDate = this.periodService.mmyyyyToFirstOfMonth(previousMonth);
        const historicalValue = await this.variableDataService.getVariableValue(
          metricAttributes.historicalVariableId,
          targetDate,
          context.variables
        );
        
        if (historicalValue !== null) {
          context.logger.log(`[SeedNodeStrategy] Found historical value ${historicalValue} from historicalVariableId for month ${previousMonth}`);
          return historicalValue;
        } else {
          context.logger.log(`[SeedNodeStrategy] historicalVariableId ${metricAttributes.historicalVariableId} returned null for month ${previousMonth}`);
        }
      } else {
        context.logger.warn(`[SeedNodeStrategy] Source metric ${sourceMetricId} has no historicalVariableId`);
      }
    } else {
      context.logger.warn(`[SeedNodeStrategy] Could not find source metric node ${sourceMetricId} in calculation trees`);
    }

    // Fallback: Check if we have a calculated historical result for the source metric in the previous month
    const sourceNodeResult = context.nodeResults.get(sourceMetricId);
    if (sourceNodeResult) {
      const monthlyValue = sourceNodeResult.values.find(v => v.month === previousMonth);
      if (monthlyValue && monthlyValue.historical !== null) {
        context.logger.log(`[SeedNodeStrategy] Fallback: Found calculated historical value ${monthlyValue.historical} from source metric ${sourceMetricId} for month ${previousMonth}`);
        return monthlyValue.historical;
      } else {
        context.logger.log(`[SeedNodeStrategy] Source metric ${sourceMetricId} has no historical value for month ${previousMonth}`);
      }
    } else {
      context.logger.warn(`[SeedNodeStrategy] Source metric ${sourceMetricId} not found in context.nodeResults - this indicates a dependency ordering issue`);
    }

    context.logger.warn(`[SeedNodeStrategy] No historical data found for source metric ${sourceMetricId} at month ${previousMonth}`);
    return null;
  }

  private async getPreviousMonthValueFromSourceMetric(
    sourceMetricId: string,
    previousMonth: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    context.logger.log(`[SeedNodeStrategy] Looking for calculated value from metric ${sourceMetricId} for month ${previousMonth}`);

    // The source metric should already be calculated and stored in context.nodeResults
    // This is because tree processor orders nodes by dependencies
    // Same-tree METRIC forecast for previous month is published incrementally
    // while that METRIC's calculateNode runs (before nodeResults is populated).
    if (calculationType === 'forecast') {
      const running = context.runningMetricForecasts.get(sourceMetricId);
      if (running && running.has(previousMonth)) {
        const rv = running.get(previousMonth) ?? null;
        context.logger.log(
          `[SeedNodeStrategy] Found forecast ${rv} from runningMetricForecasts for source metric ${sourceMetricId} month ${previousMonth}`
        );
        return rv;
      }
    }

    const sourceNodeResult = context.nodeResults.get(sourceMetricId);
    if (sourceNodeResult) {
      const monthlyValue = sourceNodeResult.values.find(v => v.month === previousMonth);
      if (monthlyValue) {
        // Get value based on calculation type
        let value: number | null = null;
        switch (calculationType) {
          case 'historical':
            value = monthlyValue.historical;
            break;
          case 'forecast':
            value = monthlyValue.forecast;
            break;
          case 'budget':
            value = monthlyValue.budget;
            break;
        }

        if (value !== null) {
          context.logger.log(`[SeedNodeStrategy] Found ${calculationType} value ${value} from source metric ${sourceMetricId} for month ${previousMonth}`);
          return value;
        } else {
          context.logger.log(`[SeedNodeStrategy] Source metric ${sourceMetricId} has null ${calculationType} value for month ${previousMonth}`);
          return null;
        }
      } else {
        context.logger.warn(`[SeedNodeStrategy] No data found for month ${previousMonth} in source metric ${sourceMetricId}`);
        return null;
      }
    }

    // If we don't have the result yet, the source metric should have been calculated first
    // due to dependency ordering in the tree processor
    context.logger.error(`[SeedNodeStrategy] Source metric ${sourceMetricId} result not found in context.nodeResults. This indicates a dependency ordering issue.`);
    return null;
  }

  /**
   * Find the source metric node from the calculation trees
   * This is needed to access the metric's historicalVariableId
   */
  private findSourceMetricNode(sourceMetricId: string, context: CalculationContext): CalculationTreeNode | null {
    // Access trees from the enhanced context that includes them
    const trees = (context.request as any).trees;
    if (!trees) {
      context.logger.warn(`[SeedNodeStrategy] No trees available in context to find source metric ${sourceMetricId}`);
      return null;
    }

    // Search through all trees to find the source metric node
    for (const tree of trees) {
      const foundNode = this.searchNodeInTree(tree.tree, sourceMetricId);
      if (foundNode) {
        return foundNode;
      }
    }

    context.logger.warn(`[SeedNodeStrategy] Source metric node ${sourceMetricId} not found in calculation trees`);
    return null;
  }

  /**
   * Recursively search for a node in a tree
   */
  private searchNodeInTree(node: CalculationTreeNode, targetNodeId: string): CalculationTreeNode | null {
    if (node.nodeId === targetNodeId) {
      return node;
    }

    // Search in children
    for (const child of node.children) {
      const found = this.searchNodeInTree(child, targetNodeId);
      if (found) {
        return found;
      }
    }

    return null;
  }
}
