/**
 * Result Builder Service - Phase 1.2
 * Builds calculation results from node results
 */

import { Injectable } from '@nestjs/common';
import { 
  CalculationResult, 
  CalculationRequest, 
  NodeResult, 
  PeriodInfo 
} from '../types/calculation-types';

@Injectable()
export class ResultBuilder {

  /**
   * Build final calculation result from node results
   */
  build(
    nodeResults: Map<string, NodeResult>, 
    request: CalculationRequest
  ): CalculationResult {
    const allNodes = Array.from(nodeResults.values());
    const { metrics, intermediateNodes } = this.separateNodeTypes(allNodes);
    
    return {
      forecastId: '', // Will be set by caller
      calculatedAt: new Date(),
      calculationTypes: request.calculationTypes,
      periodInfo: this.buildPeriodInfo(request.periods),
      nodeResults: request.includeAllNodes ? allNodes : metrics
    };
  }

  /**
   * Separate node types into metrics and intermediate nodes
   */
  private separateNodeTypes(nodes: NodeResult[]): { 
    metrics: NodeResult[]; 
    intermediateNodes: NodeResult[] 
  } {
    const metrics = nodes.filter(n => n.nodeType === 'METRIC');
    const intermediateNodes = nodes.filter(n => n.nodeType !== 'METRIC');
    return { metrics, intermediateNodes };
  }

  /**
   * Build period info from request periods
   */
  private buildPeriodInfo(periods: {
    forecast: { start: string; end: string };
    actual: { start: string; end: string };
  }): PeriodInfo {
    return {
      forecastStartMonth: periods.forecast.start,
      forecastEndMonth: periods.forecast.end,
      actualStartMonth: periods.actual.start,
      actualEndMonth: periods.actual.end
    };
  }

  /**
   * Filter results to only include specific metric nodes
   */
  filterMetrics(nodeResults: NodeResult[], metricNodeIds: string[]): NodeResult[] {
    return nodeResults.filter(result => 
      result.nodeType === 'METRIC' && metricNodeIds.includes(result.nodeId)
    );
  }

  /**
   * Get summary statistics from calculation result
   */
  getResultSummary(result: CalculationResult): {
    totalNodes: number;
    metricCount: number;
    intermediateNodeCount: number;
    monthCount: number;
    calculationTypes: string[];
  } {
    const metrics = result.nodeResults.filter(n => n.nodeType === 'METRIC');
    const intermediateNodes = result.nodeResults.filter(n => n.nodeType !== 'METRIC');
    const monthCount = result.nodeResults.length > 0 ? result.nodeResults[0].values.length : 0;

    return {
      totalNodes: result.nodeResults.length,
      metricCount: metrics.length,
      intermediateNodeCount: intermediateNodes.length,
      monthCount,
      calculationTypes: result.calculationTypes
    };
  }

  /**
   * Validate result structure
   */
  validateResult(result: CalculationResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check basic structure
    if (!result.nodeResults || !Array.isArray(result.nodeResults)) {
      errors.push('Missing or invalid nodeResults array');
      return { isValid: false, errors };
    }

    if (!result.calculationTypes || !Array.isArray(result.calculationTypes)) {
      errors.push('Missing or invalid calculationTypes array');
    }

    if (!result.periodInfo) {
      errors.push('Missing periodInfo');
    }

    // Validate each node result
    for (const nodeResult of result.nodeResults) {
      const nodeErrors = this.validateNodeResult(nodeResult);
      errors.push(...nodeErrors);
    }

    // Check that all nodes have same number of monthly values
    const monthCounts = result.nodeResults.map(n => n.values.length);
    const uniqueMonthCounts = [...new Set(monthCounts)];
    if (uniqueMonthCounts.length > 1) {
      errors.push(`Inconsistent month counts across nodes: ${uniqueMonthCounts.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual node result
   */
  private validateNodeResult(nodeResult: NodeResult): string[] {
    const errors: string[] = [];

    if (!nodeResult.nodeId) {
      errors.push('NodeResult missing nodeId');
    }

    if (!nodeResult.nodeType) {
      errors.push(`NodeResult ${nodeResult.nodeId} missing nodeType`);
    }

    if (!nodeResult.values || !Array.isArray(nodeResult.values)) {
      errors.push(`NodeResult ${nodeResult.nodeId} missing or invalid values array`);
      return errors; // Can't validate further without values
    }

    // Validate monthly values
    for (let i = 0; i < nodeResult.values.length; i++) {
      const monthlyValue = nodeResult.values[i];
      if (!monthlyValue.month) {
        errors.push(`NodeResult ${nodeResult.nodeId} value at index ${i} missing month`);
      }
      
      // Check MM-YYYY format
      if (monthlyValue.month && !/^(0[1-9]|1[0-2])-\d{4}$/.test(monthlyValue.month)) {
        errors.push(`NodeResult ${nodeResult.nodeId} value at index ${i} has invalid month format: ${monthlyValue.month}`);
      }
    }

    return errors;
  }

  /**
   * Merge multiple calculation results (useful for incremental calculations)
   */
  mergeResults(results: CalculationResult[]): CalculationResult {
    if (results.length === 0) {
      throw new Error('Cannot merge empty results array');
    }

    if (results.length === 1) {
      return results[0];
    }

    const baseResult = results[0];
    const allNodeResults = new Map<string, NodeResult>();

    // Collect all node results, with later results overriding earlier ones
    for (const result of results) {
      for (const nodeResult of result.nodeResults) {
        allNodeResults.set(nodeResult.nodeId, nodeResult);
      }
    }

    // Combine calculation types
    const allCalculationTypes = [...new Set(
      results.flatMap(r => r.calculationTypes)
    )];

    return {
      forecastId: baseResult.forecastId,
      calculatedAt: new Date(), // Use current time for merged result
      calculationTypes: allCalculationTypes,
      periodInfo: baseResult.periodInfo, // Use first result's period info
      nodeResults: Array.from(allNodeResults.values())
    };
  }
}
