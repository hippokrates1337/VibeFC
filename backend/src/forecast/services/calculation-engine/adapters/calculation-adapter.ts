/**
 * Calculation Adapter - Phase 4.1
 * Adapts legacy interfaces to the new unified calculation engine
 */

import { Injectable } from '@nestjs/common';
import { CalculationEngineCore } from '../calculation-engine-core';
import { 
  CalculationRequest,
  CalculationResult,
  CalculationTree,
  CalculationTreeNode,
  Variable
  } from '../types/calculation-types';

// Import legacy types for compatibility
import type {
  ForecastCalculationResult,
  ExtendedForecastCalculationResult,
  MetricCalculationResult,
  NodeCalculationResult,
  MonthlyForecastValue,
  MonthlyNodeValue,
  UnifiedCalculationResult,
  UnifiedCalculationRequest,
  CalculationTree as LegacyCalculationTree
} from '../types';

@Injectable()
export class CalculationAdapter {
  
  constructor(
    private readonly newEngine: CalculationEngineCore
  ) {}

  /**
   * Legacy calculateForecast method adapter
   */
  async calculateForecast(
    trees: readonly LegacyCalculationTree[],
    forecastStartDate: Date,
    forecastEndDate: Date,
    variables: readonly Variable[]
  ): Promise<ForecastCalculationResult> {
    const request = this.adaptLegacyForecastRequest(
      trees,
      forecastStartDate,
      forecastEndDate,
      variables
    );

    const result = await this.newEngine.calculate(request);
    return this.adaptToLegacyForecastResult(result);
  }

  /**
   * Legacy calculateForecastExtended method adapter
   */
  async calculateForecastExtended(
    trees: readonly LegacyCalculationTree[],
    forecastStartDate: Date,
    forecastEndDate: Date,
    variables: readonly Variable[]
  ): Promise<ExtendedForecastCalculationResult> {
    const request = this.adaptLegacyForecastRequest(
      trees,
      forecastStartDate,
      forecastEndDate,
      variables,
      true // includeAllNodes
    );

    const result = await this.newEngine.calculate(request);
    return this.adaptToExtendedForecastResult(result);
  }

  /**
   * Legacy calculateHistoricalValues method adapter
   */
  async calculateHistoricalValues(
    trees: readonly LegacyCalculationTree[],
    actualStartDate: Date,
    actualEndDate: Date,
    variables: readonly Variable[]
  ): Promise<ExtendedForecastCalculationResult> {
    const request = this.adaptLegacyHistoricalRequest(
      trees,
      actualStartDate,
      actualEndDate,
      variables
    );

    const result = await this.newEngine.calculate(request);
    return this.adaptToExtendedForecastResult(result);
  }

  /**
   * Calculate with periods method adapter
   */
  async calculateWithPeriods(
    trees: readonly LegacyCalculationTree[],
    forecastStartMonth: string,
    forecastEndMonth: string,
    actualStartMonth: string,
    actualEndMonth: string,
    variables: readonly Variable[],
    request: UnifiedCalculationRequest
  ): Promise<UnifiedCalculationResult> {
    const unifiedRequest = this.adaptUnifiedRequest(
      trees,
      forecastStartMonth,
      forecastEndMonth,
      actualStartMonth,
      actualEndMonth,
      variables,
      request
    );

    const result = await this.newEngine.calculate(unifiedRequest);
    return this.adaptToUnifiedResult(result);
  }

  // Private adapter methods

  private adaptLegacyForecastRequest(
    trees: readonly LegacyCalculationTree[],
    forecastStartDate: Date,
    forecastEndDate: Date,
    variables: readonly Variable[],
    includeAllNodes: boolean = false
  ): CalculationRequest {
    return {
      trees: this.convertLegacyTrees(trees),
      periods: {
        forecast: {
          start: this.dateToMMYYYY(forecastStartDate),
          end: this.dateToMMYYYY(forecastEndDate)
        },
        actual: {
          start: this.dateToMMYYYY(this.subtractMonths(forecastStartDate, 6)),
          end: this.dateToMMYYYY(this.subtractMonths(forecastStartDate, 1))
        }
      },
      calculationTypes: ['forecast'],
      includeAllNodes,
      variables: [...variables]
    };
  }

  private adaptLegacyHistoricalRequest(
    trees: readonly LegacyCalculationTree[],
    actualStartDate: Date,
    actualEndDate: Date,
    variables: readonly Variable[]
  ): CalculationRequest {
    return {
      trees: this.convertLegacyTrees(trees),
      periods: {
        forecast: {
          start: this.dateToMMYYYY(this.addMonths(actualEndDate, 1)),
          end: this.dateToMMYYYY(this.addMonths(actualEndDate, 12))
        },
        actual: {
          start: this.dateToMMYYYY(actualStartDate),
          end: this.dateToMMYYYY(actualEndDate)
        }
      },
      calculationTypes: ['historical'],
      includeAllNodes: true,
      variables: [...variables]
    };
  }

  private adaptUnifiedRequest(
    trees: readonly LegacyCalculationTree[],
    forecastStartMonth: string,
    forecastEndMonth: string,
    actualStartMonth: string,
    actualEndMonth: string,
    variables: readonly Variable[],
    request: UnifiedCalculationRequest
  ): CalculationRequest {
    return {
      trees: this.convertLegacyTrees(trees),
      periods: {
        forecast: {
          start: forecastStartMonth,
          end: forecastEndMonth
        },
        actual: {
          start: actualStartMonth,
          end: actualEndMonth
        }
      },
      calculationTypes: request.calculationTypes,
      includeAllNodes: request.includeIntermediateNodes,
      variables: [...variables]
    };
  }

  private convertLegacyTrees(trees: readonly LegacyCalculationTree[]): CalculationTree[] {
    return trees.map(tree => ({
      rootMetricNodeId: tree.rootMetricNodeId,
      tree: tree.tree as CalculationTreeNode
    }));
  }

  private adaptToLegacyForecastResult(result: CalculationResult): ForecastCalculationResult {
    return {
      forecastId: result.forecastId,
      calculatedAt: result.calculatedAt,
      metrics: this.convertToLegacyMetrics(result.nodeResults.filter(n => n.nodeType === 'METRIC'))
    };
  }

  private adaptToExtendedForecastResult(result: CalculationResult): ExtendedForecastCalculationResult {
    const metrics = this.convertToLegacyMetrics(result.nodeResults.filter(n => n.nodeType === 'METRIC'));
    const allNodes = this.convertToLegacyNodes(result.nodeResults);

    return {
      forecastId: result.forecastId,
      calculatedAt: result.calculatedAt,
      metrics,
      allNodes
    };
  }

  private adaptToUnifiedResult(result: CalculationResult): UnifiedCalculationResult {
    return {
      forecastId: result.forecastId,
      calculatedAt: result.calculatedAt,
      calculationTypes: result.calculationTypes,
      periodInfo: result.periodInfo,
      metrics: this.convertToUnifiedNodes(result.nodeResults.filter(n => n.nodeType === 'METRIC')),
      allNodes: this.convertToUnifiedNodes(result.nodeResults)
    };
  }

  private convertToLegacyMetrics(nodeResults: import('../types/calculation-types').NodeResult[]): MetricCalculationResult[] {
    return nodeResults.map(node => ({
      metricNodeId: node.nodeId,
      values: node.values.map(value => ({
        date: this.mmyyyyToDate(value.month),
        forecast: value.forecast,
        budget: value.budget,
        historical: value.historical
      } as MonthlyForecastValue))
    }));
  }

  private convertToLegacyNodes(nodeResults: import('../types/calculation-types').NodeResult[]): NodeCalculationResult[] {
    return nodeResults.map(node => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType as any,
      nodeData: node.nodeData, // Preserve node attributes/configuration
      values: node.values.map(value => ({
        date: this.mmyyyyToDate(value.month),
        forecast: value.forecast,
        budget: value.budget,
        historical: value.historical,
        calculated: value.calculated
      } as MonthlyNodeValue))
    }));
  }

  private convertToUnifiedNodes(nodeResults: import('../types/calculation-types').NodeResult[]): any[] {
    return nodeResults.map(node => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeData: node.nodeData, // Preserve node attributes/configuration
      values: node.values.map(value => ({
        month: value.month,
        historical: value.historical,
        forecast: value.forecast,
        budget: value.budget,
        calculated: value.calculated
      }))
    }));
  }

  // Date utility methods
  private dateToMMYYYY(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${year}`;
  }

  private mmyyyyToDate(mmyyyy: string): Date {
    const [month, year] = mmyyyy.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private subtractMonths(date: Date, months: number): Date {
    return this.addMonths(date, -months);
  }
}
