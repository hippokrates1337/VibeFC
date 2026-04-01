/**
 * Core Calculation Engine - Phase 3.1
 * Single unified calculation engine replacing the 18-method legacy implementation
 */

import { Injectable, Inject } from '@nestjs/common';
import { 
  CalculationRequest,
  CalculationResult,
  CalculationContext,
  NodeResult,
  MonthlyValue,
  CalculationType,
  CalculationError,
  ValidationError,
  CalculationTree,
  CalculationTreeNode,
  PeriodConfiguration
} from './types/calculation-types';
import { NodeEvaluator } from './services/node-evaluator';
import { TreeProcessor } from './services/tree-processor';
import { ResultBuilder } from './services/result-builder';
import { CalculationValidator } from './services/calculation-validator';
import { PeriodService } from './services/period-service';
import { CalculationCacheService } from './services/calculation-cache';
import { NodeExecutionInfo } from '../../types/debug-types';
import { DebugCollectorService } from '../debug-collector.service';

@Injectable()
export class CalculationEngineCore {
  
  constructor(
    private readonly nodeEvaluator: NodeEvaluator,
    private readonly treeProcessor: TreeProcessor,
    private readonly resultBuilder: ResultBuilder,
    private readonly validator: CalculationValidator,
    private readonly periodService: PeriodService,
    private readonly cache: CalculationCacheService,
    @Inject('Logger') private readonly logger: any,
    private readonly debugCollector: DebugCollectorService
  ) {
    this.logger.log('[CalculationEngineCore] Initialized with all dependencies');
    this.logger.log('[CalculationEngineCore] Debug collector wired (steps recorded when debug run initializes collector)');
  }

  /**
   * Single unified calculation method - replaces all legacy methods
   */
  async calculate(request: CalculationRequest): Promise<CalculationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log('[CalculationEngineCore] Starting comprehensive calculation');
      this.logger.log(`[CalculationEngineCore] Calculation types: [${request.calculationTypes.join(', ')}]`);
      this.logger.log(`[CalculationEngineCore] Include all nodes: ${request.includeAllNodes}`);
      this.logger.log(`[CalculationEngineCore] Processing ${request.trees.length} calculation trees`);
      this.logger.log(`[CalculationEngineCore] Request structure:`, JSON.stringify({
        calculationTypes: request.calculationTypes,
        includeAllNodes: request.includeAllNodes,
        treesCount: request.trees.length,
        periods: request.periods,
        variablesCount: request.variables.length
      }, null, 2));

      // Debug: Record validation phase start
      if (this.debugCollector.isDebugSessionActive()) {
        this.debugCollector.recordPhaseStart('validation');
      }

      // Step 1: Validate request
      const validation = await this.validator.validate(request);
      if (!validation.isValid) {
        this.logger.error('[CalculationEngineCore] Validation errors:', validation.errors);
        if (this.debugCollector.isDebugSessionActive()) {
          validation.errors.forEach(error => this.debugCollector.recordError('validation', error));
        }
        throw new ValidationError('Request validation failed', validation.errors);
      }

      if (validation.warnings.length > 0) {
        this.logger.warn('[CalculationEngineCore] Validation warnings:', validation.warnings);
        if (this.debugCollector.isDebugSessionActive()) {
          validation.warnings.forEach(warning => this.debugCollector.recordWarning(warning));
        }
      }

      // Debug: Record validation phase end and tree processing start
      if (this.debugCollector.isDebugSessionActive()) {
        this.debugCollector.recordPhaseEnd('validation');
        this.debugCollector.recordPhaseStart('treeProcessing');
      }

      // Step 2: Process trees and periods
      const orderedTrees = this.treeProcessor.orderByDependencies(request.trees);
      const periods = this.periodService.processPeriods(request.periods);

      this.logger.log(`[CalculationEngineCore] Tree processing order: [${orderedTrees.map(t => t.rootMetricNodeId).join(', ')}]`);
      this.logger.log(`[CalculationEngineCore] Forecast months: [${periods.forecastMonths.join(', ')}]`);
      this.logger.log(`[CalculationEngineCore] Actual months: [${periods.actualMonths.join(', ')}]`);
      this.logger.log(`[CalculationEngineCore] All calculation months: [${periods.allMonths.join(', ')}]`);

      // Debug: Record tree processing end and calculation start
      if (this.debugCollector.isDebugSessionActive()) {
        this.debugCollector.recordPhaseEnd('treeProcessing');
        this.debugCollector.recordPhaseStart('calculation');
      }

      // Step 3: Create calculation context
      const context = this.createContext(request, periods);

      // Step 4: Calculate all nodes
      const nodeResults = await this.calculateAllNodes(orderedTrees, context);

      // Debug: Record calculation end and result building start
      if (this.debugCollector.isDebugSessionActive()) {
        this.debugCollector.recordPhaseEnd('calculation');
        this.debugCollector.recordPhaseStart('resultBuilding');
      }

      // Step 5: Build and return result
      const result = this.resultBuilder.build(nodeResults, request);
      result.forecastId = ''; // Will be set by caller

      // Debug: Record result building end
      if (this.debugCollector.isDebugSessionActive()) {
        this.debugCollector.recordPhaseEnd('resultBuilding');
      }

      const duration = Date.now() - startTime;
      this.logger.log(`[CalculationEngineCore] Comprehensive calculation completed in ${duration}ms`);
      this.logger.log(`[CalculationEngineCore] Calculated ${nodeResults.size} nodes with ${result.nodeResults.length} results`);

      // Validate result structure
      const resultValidation = this.resultBuilder.validateResult(result);
      if (!resultValidation.isValid) {
        this.logger.error('[CalculationEngineCore] Result validation failed:', resultValidation.errors);
        throw new CalculationError('Result validation failed', resultValidation.errors);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[CalculationEngineCore] Calculation failed after ${duration}ms:`, error);
      
      if (error instanceof ValidationError || error instanceof CalculationError) {
        throw error;
      }
      
      throw new CalculationError(
        `Comprehensive calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [],
        undefined,
        undefined
      );
    }
  }

  /**
   * Calculate all nodes across all trees
   */
  private async calculateAllNodes(
    trees: CalculationTree[],
    context: CalculationContext
  ): Promise<Map<string, NodeResult>> {
    const results = new Map<string, NodeResult>();
    
    // Process trees in dependency order
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      this.logger.log(`[CalculationEngineCore] Processing tree ${i + 1}/${trees.length} (metric: ${tree.rootMetricNodeId})`);
      
      // Debug: Record tree start
      if (this.debugCollector.isDebugSessionActive()) {
        this.debugCollector.startTree(tree.rootMetricNodeId);
      }
      
      await this.calculateTree(tree, context, results);
      
      // Debug: Record tree end
      if (this.debugCollector.isDebugSessionActive()) {
        this.debugCollector.endTree(tree.rootMetricNodeId);
      }
    }
    
    return results;
  }

  /**
   * Calculate all nodes in a single tree
   */
  private async calculateTree(
    tree: CalculationTree,
    context: CalculationContext,
    results: Map<string, NodeResult>
  ): Promise<void> {
    // Get nodes in calculation order (dependencies first)
    const nodes = this.treeProcessor.flattenToNodes(tree);
    
    this.logger.log(`[CalculationEngineCore] Tree ${tree.rootMetricNodeId} has ${nodes.length} nodes to calculate`);
    
    // Calculate each node (METRIC root only — subgraph runs via evaluator)
    for (const node of nodes) {
      if (!results.has(node.nodeId)) {
        // Debug: Record node start
        if (this.debugCollector.isDebugSessionActive()) {
          this.debugCollector.startNode(node.nodeId, node.nodeType);
        }
        
        const nodeResult = await this.calculateNode(node, context);
        results.set(node.nodeId, nodeResult);
        
        // Also store in context for SEED node dependencies
        context.nodeResults.set(node.nodeId, nodeResult);
      }
    }

    // Second pass: materialize SEED/OPERATOR/DATA/etc. into nodeResults so clients
    // (allNodes badges) receive per-node rows. Cached evaluates from the METRIC
    // pass are cheap; METRIC is skipped (already in results).
    const materializeOrder = this.treeProcessor.flattenForIntermediateResults(tree);
    for (const node of materializeOrder) {
      if (!results.has(node.nodeId)) {
        if (this.debugCollector.isDebugSessionActive()) {
          this.debugCollector.startNode(node.nodeId, node.nodeType);
        }
        const nodeResult = await this.calculateNode(node, context);
        results.set(node.nodeId, nodeResult);
        context.nodeResults.set(node.nodeId, nodeResult);
      }
    }
  }

  /**
   * Calculate a single node for all months and calculation types
   */
  private async calculateNode(
    node: CalculationTreeNode,
    context: CalculationContext
  ): Promise<NodeResult> {
    const nodeStartTime = Date.now();
    this.logger.log(`[CalculationEngineCore] Calculating node ${node.nodeId} (${node.nodeType})`);
    
    const values: MonthlyValue[] = [];
    let stepCounter = 0;
    
    // Calculate for each month
    for (const month of context.periods.allMonths) {
      let forecastEvalError: string | undefined;
      let forecastComputedValue: number | null | undefined;
      const monthlyValue: MonthlyValue = {
        month,
        historical: null,
        forecast: null,
        budget: null,
        calculated: null
      };
      
      // Calculate for each requested calculation type
      for (const calcType of context.request.calculationTypes) {
        if (this.shouldCalculateForMonth(month, calcType, context)) {
          const evaluationStartTime = Date.now();
          let value: number | null = null;
          let errorMessage: string | undefined;
          
          try {
            value = await this.nodeEvaluator.evaluate(node, month, calcType, context);
          } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'Unknown evaluation error';
            if (calcType === 'forecast') {
              forecastEvalError = errorMessage;
            }
            this.logger.error(`[CalculationEngineCore] Node ${node.nodeId} evaluation failed for ${month} ${calcType}:`, error);
            
            // Debug: Record error
            if (this.debugCollector.isDebugSessionActive()) {
              this.debugCollector.recordError(node.nodeId, errorMessage);
            }
          }
          
          const evaluationEndTime = Date.now();
          
          // Debug: Record calculation step
          if (this.debugCollector.isDebugSessionActive()) {
            this.debugCollector.recordStep({
              nodeId: node.nodeId,
              nodeType: node.nodeType,
              stepNumber: ++stepCounter,
              month,
              calculationType: calcType,
              inputs: this.getNodeInputs(node, month, calcType, context),
              output: value,
              executionTimeMs: evaluationEndTime - evaluationStartTime,
              dependencies: this.getNodeDependencies(node),
              errorMessage,
              nodeAttributes: node.nodeData,
              timestamp: new Date()
            });
          }
          
          // Store value in appropriate field
          switch (calcType) {
            case 'historical':
              monthlyValue.historical = value;
              break;
            case 'forecast':
              monthlyValue.forecast = value;
              forecastComputedValue = value;
              if (node.nodeType === 'METRIC') {
                let perMonth = context.runningMetricForecasts.get(node.nodeId);
                if (!perMonth) {
                  perMonth = new Map<string, number | null>();
                  context.runningMetricForecasts.set(node.nodeId, perMonth);
                }
                perMonth.set(month, value);
              }
              break;
            case 'budget':
              monthlyValue.budget = value;
              break;
          }
        }
      }

      // Canonical "calculated" for non-METRIC nodes: do not mirror the last calc-type
      // iteration only (budget often null would overwrite a non-null forecast).
      if (node.nodeType !== 'METRIC') {
        monthlyValue.calculated =
          monthlyValue.forecast ?? monthlyValue.historical ?? monthlyValue.budget;
      }

      values.push(monthlyValue);
    }
    
    const nodeResult: NodeResult = {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeData: node.nodeData, // Preserve node attributes/configuration
      values
    };
    
    const nodeEndTime = Date.now();
    const nodeExecutionTime = nodeEndTime - nodeStartTime;
    
    // Debug: Record node execution info
    if (this.debugCollector.isDebugSessionActive()) {
      const executionInfo: NodeExecutionInfo = {
        nodeId: node.nodeId,
        startTime: nodeStartTime,
        endTime: nodeEndTime,
        inputs: [],
        output: values.length > 0 ? values[0].calculated : null,
        cacheHit: false, // Would need cache integration to determine this
        errorMessage: undefined
      };
      
      this.debugCollector.endNode(node.nodeId, executionInfo);
    }
    
    this.logger.log(`[CalculationEngineCore] Node ${node.nodeId} calculated with ${values.length} monthly values in ${nodeExecutionTime}ms`);
    return nodeResult;
  }

  /**
   * Determine if we should calculate for a specific month and calculation type
   */
  private shouldCalculateForMonth(
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): boolean {
    switch (calculationType) {
      case 'forecast':
        return context.periods.forecastMonths.includes(month);
      case 'historical':
        return context.periods.actualMonths.includes(month);
      case 'budget':
        // Budget calculations typically use forecast period
        return context.periods.forecastMonths.includes(month);
      default:
        return false;
    }
  }

  /**
   * Create calculation context
   */
  private createContext(
    request: CalculationRequest,
    periods: PeriodConfiguration
  ): CalculationContext {
    // Clear cache for fresh calculation
    this.cache.clear();
    
    return {
      variables: request.variables,
      periods,
      cache: this.cache,
      nodeResults: new Map(),
      request,
      logger: this.logger,
      runningMetricForecasts: new Map<string, Map<string, number | null>>()
    };
  }

  /**
   * Get calculation engine statistics
   */
  getStats(): {
    supportedCalculationTypes: CalculationType[];
    supportedNodeTypes: string[];
    cacheStats: { size: number };
  } {
    return {
      supportedCalculationTypes: ['historical', 'forecast', 'budget'],
      supportedNodeTypes: this.nodeEvaluator.getSupportedNodeTypes(),
      cacheStats: this.cache.getStats()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.logger.log('[CalculationEngineCore] Clearing all caches');
    this.cache.clear();
    this.nodeEvaluator.clearCaches();
  }

  /**
   * Debug helper: Get node inputs for debugging purposes
   */
  private getNodeInputs(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): any[] {
    const inputs: any[] = [];
    
    try {
      // For operator nodes, get child values
      if (node.nodeType === 'OPERATOR' && node.children) {
        for (const child of node.children) {
          const childResult = context.nodeResults.get(child.nodeId);
          if (childResult) {
            const monthlyValue = childResult.values.find(v => v.month === month);
            if (monthlyValue) {
              const value = this.getValueByCalculationType(monthlyValue, calculationType);
              inputs.push({ nodeId: child.nodeId, value });
            }
          }
        }
      }
      
      // For data nodes, include variable information
      if (node.nodeType === 'DATA') {
        const nodeData = node.nodeData as any;
        inputs.push({
          variableId: nodeData?.variableId,
          offsetMonths: nodeData?.offsetMonths || 0,
          targetMonth: month
        });
      }
      
      // For constant nodes, include the value
      if (node.nodeType === 'CONSTANT') {
        const nodeData = node.nodeData as any;
        inputs.push({ value: nodeData?.value });
      }
      
      // For seed nodes, include source metric information
      if (node.nodeType === 'SEED') {
        const nodeData = node.nodeData as any;
        inputs.push({
          sourceMetricId: nodeData?.sourceMetricId,
          month,
          calculationType
        });
      }
    } catch (error) {
      // If we can't get inputs, just return empty array
      this.logger.warn(`[CalculationEngineCore] Could not get inputs for node ${node.nodeId}:`, error);
    }
    
    return inputs;
  }

  /**
   * Debug helper: Get node dependencies
   */
  private getNodeDependencies(node: CalculationTreeNode): string[] {
    const dependencies: string[] = [];
    
    if (node.children) {
      dependencies.push(...node.children.map(child => child.nodeId));
    }
    
    // For seed nodes, add source metric as dependency
    if (node.nodeType === 'SEED') {
      const nodeData = node.nodeData as any;
      if (nodeData?.sourceMetricId) {
        dependencies.push(nodeData.sourceMetricId);
      }
    }
    
    return dependencies;
  }

  /**
   * Debug helper: Get value by calculation type from monthly value
   */
  private getValueByCalculationType(monthlyValue: MonthlyValue, calculationType: CalculationType): number | null {
    switch (calculationType) {
      case 'historical':
        return monthlyValue.historical;
      case 'forecast':
        return monthlyValue.forecast;
      case 'budget':
        return monthlyValue.budget;
      default:
        return monthlyValue.calculated;
    }
  }

  /**
   * Validate calculation request (quick validation)
   */
  async validateRequest(request: CalculationRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return await this.validator.validate(request);
  }

  /**
   * Dry run validation without performing calculation
   */
  async dryRun(request: CalculationRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    estimatedNodes: number;
    estimatedMonths: number;
  }> {
    const validation = await this.validator.validate(request);
    
    if (!validation.isValid) {
      return {
        ...validation,
        estimatedNodes: 0,
        estimatedMonths: 0
      };
    }

    const periods = this.periodService.processPeriods(request.periods);
    const allNodes = this.treeProcessor.flattenAllTrees(request.trees);
    
    return {
      ...validation,
      estimatedNodes: allNodes.length,
      estimatedMonths: periods.allMonths.length
    };
  }
}
