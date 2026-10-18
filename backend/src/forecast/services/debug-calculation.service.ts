import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ForecastCalculationService } from './forecast-calculation.service';
import { DebugCollectorService } from './debug-collector.service';
import { 
  DebugCalculationRequestDto, 
  DebugCalculationResultDto,
  DebugCalculationTreeDto,
  CalculationTreeRequestDto
} from '../dto/debug-calculation.dto';
import { 
  DebugCalculationRequest, 
  DebugCalculationResult, 
  DebugConfiguration,
  DebugCalculationStep,
  DebugCalculationTree,
  DebugTreeNode,
  CalculationType
} from '../types/debug-types';
import { UnifiedCalculationRequestDto } from '../dto/calculation.dto';
import { CalculationTypeDto } from '../dto/calculation.dto';
import { CalculationTree, CalculationTreeNode } from './calculation-engine/types/calculation-types';

/**
 * Debug Calculation Service
 * Provides enhanced calculation functionality with comprehensive debug information
 * Wraps the existing calculation engine with debug instrumentation
 */
@Injectable()
export class DebugCalculationService {
  private readonly logger = new Logger(DebugCalculationService.name);

  /**
   * Steps of the last debug run, keyed by user + forecast. The collector itself is a
   * shared singleton, so reading it directly would return whoever ran last.
   */
  private static readonly MAX_STORED_RUNS = 50;
  private readonly lastStepsByRun = new Map<string, DebugCalculationStep[]>();

  private runKey(userId: string, forecastId: string): string {
    return `${userId}:${forecastId}`;
  }

  private storeSteps(userId: string, forecastId: string, steps: DebugCalculationStep[]): void {
    const key = this.runKey(userId, forecastId);
    this.lastStepsByRun.delete(key);
    this.lastStepsByRun.set(key, [...steps]);
    if (this.lastStepsByRun.size > DebugCalculationService.MAX_STORED_RUNS) {
      const oldestKey = this.lastStepsByRun.keys().next().value;
      if (oldestKey !== undefined) {
        this.lastStepsByRun.delete(oldestKey);
      }
    }
  }

  /**
   * Map CalculationType from debug-types to CalculationTypeDto
   */
  private mapCalculationType(calcType: CalculationType): CalculationTypeDto {
    switch (calcType) {
      case 'historical':
        return CalculationTypeDto.HISTORICAL;
      case 'forecast':
        return CalculationTypeDto.FORECAST;
      case 'budget':
        return CalculationTypeDto.BUDGET;
      default:
        throw new Error(`Unknown calculation type: ${calcType}`);
    }
  }

  constructor(
    private readonly forecastCalculationService: ForecastCalculationService,
    private readonly debugCollector: DebugCollectorService
  ) {}

  /**
   * Trigger calculation with comprehensive debug information
   */
  async calculateWithDebug(
    forecastId: string,
    userId: string,
    request: any, // Express request object
    debugRequest: DebugCalculationRequestDto
  ): Promise<DebugCalculationResultDto> {
    const startTime = Date.now();
    this.logger.log(`[DebugCalculation] Starting debug calculation for forecast ${forecastId}`);
    this.logger.log(`[DebugCalculation] Debug level: ${debugRequest.debugLevel || 'basic'}`);
    this.logger.log(`[DebugCalculation] Calculation types: [${debugRequest.calculationTypes.join(', ')}]`);

    try {
      // Prepare debug configuration
      const debugConfig: DebugConfiguration = {
        level: debugRequest.debugLevel || 'basic',
        includePerformanceMetrics: debugRequest.includePerformanceMetrics ?? true,
        includeMemoryUsage: debugRequest.includeMemoryUsage ?? false,
        focusNodeIds: debugRequest.focusNodeIds,
        maxStepsToCapture: this.getMaxStepsForLevel(debugRequest.debugLevel || 'basic')
      };

      // Initialize debug collection
      this.debugCollector.startCalculation(debugConfig);
      this.debugCollector.recordPhaseStart('validation');

      // Convert debug request to standard unified calculation request
      const unifiedRequest: UnifiedCalculationRequestDto = {
        calculationTypes: debugRequest.calculationTypes,
        includeIntermediateNodes: debugRequest.includeIntermediateNodes ?? true
      };

      // Get calculation tree structure before calculation
      this.debugCollector.recordPhaseEnd('validation');
      this.debugCollector.recordPhaseStart('treeProcessing');
      
      const calculationTree = await this.getCalculationTreeStructure(forecastId, userId, request);
      this.debugCollector.setCalculationTree(calculationTree.trees, calculationTree.dependencyGraph);
      
      this.debugCollector.recordPhaseEnd('treeProcessing');
      this.debugCollector.recordPhaseStart('calculation');

      // Unified calculation; CalculationEngineCore shares DebugCollectorService and records steps when this session is active.
      const result = await this.forecastCalculationService.calculateForecastWithPeriods(
        forecastId,
        userId,
        request,
        unifiedRequest
      );

      this.debugCollector.recordPhaseEnd('calculation');
      this.debugCollector.recordPhaseStart('resultBuilding');

      // Collect debug information
      const debugInfo = this.debugCollector.getDebugInfo();

      this.debugCollector.recordPhaseEnd('resultBuilding');
      this.debugCollector.endCalculation();
      this.storeSteps(userId, forecastId, debugInfo.calculationSteps);

      // Create debug result
      const debugResult: DebugCalculationResultDto = {
        ...result,
        debugInfo: {
          calculationTree: this.mapToDebugTreeDto(debugInfo.calculationTree),
          calculationSteps: debugInfo.calculationSteps.map(step => ({
            nodeId: step.nodeId,
            nodeType: step.nodeType,
            stepNumber: step.stepNumber,
            month: step.month,
            calculationType: this.mapCalculationType(step.calculationType),
            inputs: step.inputs,
            output: step.output,
            executionTimeMs: step.executionTimeMs,
            dependencies: step.dependencies,
            errorMessage: step.errorMessage,
            nodeAttributes: step.nodeAttributes
          })),
          performanceMetrics: {
            totalExecutionTimeMs: debugInfo.performanceMetrics.totalExecutionTimeMs,
            nodeExecutionTimes: debugInfo.performanceMetrics.nodeExecutionTimes,
            cacheHitRate: debugInfo.performanceMetrics.cacheHitRate,
            totalCacheHits: debugInfo.performanceMetrics.totalCacheHits,
            totalCacheMisses: debugInfo.performanceMetrics.totalCacheMisses,
            memoryUsageMB: debugInfo.performanceMetrics.memoryUsageMB,
            phaseTimings: debugInfo.performanceMetrics.phaseTimings
          },
          warnings: debugInfo.warnings,
          errors: debugInfo.errors
        }
      };

      const totalTime = Date.now() - startTime;
      this.logger.log(`[DebugCalculation] Debug calculation completed in ${totalTime}ms`);
      this.logger.log(`[DebugCalculation] Captured ${debugInfo.calculationSteps.length} calculation steps`);
      this.logger.log(`[DebugCalculation] Cache hit rate: ${debugInfo.performanceMetrics.cacheHitRate}%`);

      return debugResult;
    } catch (error) {
      this.logger.error(`[DebugCalculation] Debug calculation failed:`, error);
      this.debugCollector.recordError('system', error.message);
      this.debugCollector.endCalculation();
      throw error;
    }
  }

  /**
   * Get calculation tree structure without performing full calculation
   */
  async getCalculationTree(
    forecastId: string,
    userId: string,
    request: Request,
    _requestDto?: CalculationTreeRequestDto
  ): Promise<DebugCalculationTreeDto> {
    this.logger.log(`[DebugCalculation] Getting calculation tree for forecast ${forecastId}`);

    try {
      const treeStructure = await this.getCalculationTreeStructure(forecastId, userId, request);
      return this.mapToDebugTreeDto(treeStructure);
    } catch (error) {
      this.logger.error(`[DebugCalculation] Failed to get calculation tree:`, error);
      throw error;
    }
  }

  /**
   * Get the calculation steps of this user's last debug calculation for this forecast.
   * Only runs the same user started are returned (the run itself was access-checked
   * when it loaded the forecast). Kept in memory per instance.
   */
  async getCalculationSteps(forecastId: string, userId: string): Promise<DebugCalculationStep[]> {
    this.logger.log(`[DebugCalculation] Getting calculation steps for forecast ${forecastId}`);
    return this.lastStepsByRun.get(this.runKey(userId, forecastId)) ?? [];
  }

  /**
   * Load forecast graph and build debug tree structure (same source as unified calculation).
   */
  private async getCalculationTreeStructure(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<DebugCalculationTree> {
    const calcTrees = await this.forecastCalculationService.loadCalculationTreesForForecast(
      forecastId,
      userId,
      request
    );

    const metricOrder = calcTrees.map((t) => t.rootMetricNodeId);
    const trees: DebugTreeNode[] = calcTrees.map((ct) =>
      this.debugCollector.convertTreeNodeToDebug(ct.tree)
    );
    const dependencyGraph = this.buildDependencyGraphFromCalcTrees(calcTrees);

    let totalNodes = 0;
    const countNodes = (n: CalculationTreeNode) => {
      totalNodes++;
      n.children.forEach(countNodes);
    };
    calcTrees.forEach((ct) => countNodes(ct.tree));

    return {
      trees,
      executionOrder: [],
      totalNodes,
      dependencyGraph,
      metricOrder,
    };
  }

  private buildDependencyGraphFromCalcTrees(calcTrees: CalculationTree[]): Record<string, string[]> {
    const dependencyGraph: Record<string, string[]> = {};
    const walk = (n: CalculationTreeNode) => {
      dependencyGraph[n.nodeId] = n.children.map((c) => c.nodeId);
      n.children.forEach(walk);
    };
    calcTrees.forEach((ct) => walk(ct.tree));
    return dependencyGraph;
  }

  /**
   * Map internal debug tree to DTO
   */
  private mapToDebugTreeDto(tree: DebugCalculationTree): DebugCalculationTreeDto {
    return {
      trees: tree.trees.map(node => this.mapDebugTreeNodeToDto(node)),
      executionOrder: tree.executionOrder,
      totalNodes: tree.totalNodes,
      dependencyGraph: tree.dependencyGraph,
      metricOrder: tree.metricOrder
    };
  }

  /**
   * Map debug tree node to DTO
   */
  private mapDebugTreeNodeToDto(node: any): any {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeData: node.nodeData,
      children: node.children.map((child: any) => this.mapDebugTreeNodeToDto(child)),
      inputOrder: node.inputOrder,
      position: node.position,
      label: node.label,
      isReference: node.isReference
    };
  }

  /**
   * Get maximum steps to capture based on debug level
   */
  private getMaxStepsForLevel(level: string): number {
    switch (level) {
      case 'basic':
        return 100;
      case 'detailed':
        return 1000;
      case 'verbose':
        return 10000;
      default:
        return 100;
    }
  }
}
