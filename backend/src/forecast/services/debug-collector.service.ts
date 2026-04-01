import { Injectable } from '@nestjs/common';
import { 
  DebugCollector, 
  DebugConfiguration, 
  DebugCalculationStep, 
  DebugInfo,
  DebugPerformanceMetrics,
  DebugCalculationTree,
  NodeExecutionInfo,
  DebugTreeNode
} from '../types/debug-types';
import { NodeType, CalculationTreeNode } from './calculation-engine/types/calculation-types';

/**
 * Service for collecting debug information during forecast calculations
 * Implements the DebugCollector interface to provide comprehensive debugging data
 */
@Injectable()
export class DebugCollectorService implements DebugCollector {
  private config?: DebugConfiguration;
  private steps: DebugCalculationStep[] = [];
  private nodeExecutionTimes: Map<string, number> = new Map();
  private stepCounter = 0;
  private startTime: Date;
  private phaseStartTimes: Map<string, number> = new Map();
  private cacheStats = { hits: 0, misses: 0 };
  private warnings: string[] = [];
  private errors: string[] = [];
  private trees: DebugTreeNode[] = [];
  private executionOrder: string[] = [];
  private dependencyGraph: Record<string, string[]> = {};
  private metricOrder: string[] = [];
  private currentTreeProcessing: Map<string, number> = new Map();

  /**
   * True after {@link startCalculation} until {@link endCalculation}.
   * The calculation engine always injects this service; it only records when a debug session is active.
   */
  isDebugSessionActive(): boolean {
    return this.config !== undefined;
  }

  startCalculation(config: DebugConfiguration): void {
    this.config = config;
    this.reset();
    this.startTime = new Date();
    this.recordPhaseStart('total');
  }

  endCalculation(): void {
    if (!this.config) {
      return;
    }
    this.recordPhaseEnd('total');
    this.config = undefined;
  }

  startTree(treeId: string): void {
    if (!this.config) {
      return;
    }
    this.currentTreeProcessing.set(treeId, Date.now());
    this.metricOrder.push(treeId);
  }

  endTree(treeId: string): void {
    if (!this.config) {
      return;
    }
    const startTime = this.currentTreeProcessing.get(treeId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.nodeExecutionTimes.set(`tree_${treeId}`, duration);
      this.currentTreeProcessing.delete(treeId);
    }
  }

  startNode(nodeId: string, nodeType: NodeType): void {
    if (!this.config) {
      return;
    }
    // Node timing will be handled in endNode
  }

  endNode(nodeId: string, result: NodeExecutionInfo): void {
    if (!this.config) {
      return;
    }
    const duration = result.endTime - result.startTime;
    this.nodeExecutionTimes.set(nodeId, duration);
    this.executionOrder.push(nodeId);

    // Update cache stats
    if (result.cacheHit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    // Record error if present
    if (result.errorMessage) {
      this.recordError(nodeId, result.errorMessage);
    }
  }

  recordStep(step: DebugCalculationStep): void {
    if (!this.config) {
      return;
    }
    // Only record steps if we're within the configured limit
    if (this.config.maxStepsToCapture && this.steps.length >= this.config.maxStepsToCapture) {
      return;
    }

    // Only record steps for focused nodes if specified
    if (this.config.focusNodeIds && !this.config.focusNodeIds.includes(step.nodeId)) {
      return;
    }

    this.steps.push({
      ...step,
      stepNumber: ++this.stepCounter,
      timestamp: new Date()
    });
  }

  recordCacheHit(nodeId: string): void {
    if (!this.config) {
      return;
    }
    this.cacheStats.hits++;
  }

  recordCacheMiss(nodeId: string): void {
    if (!this.config) {
      return;
    }
    this.cacheStats.misses++;
  }

  recordError(nodeId: string, error: string): void {
    if (!this.config) {
      return;
    }
    this.errors.push(`Node ${nodeId}: ${error}`);
  }

  recordWarning(message: string): void {
    if (!this.config) {
      return;
    }
    this.warnings.push(message);
  }

  /**
   * Set the calculation tree structure for debug info
   */
  setCalculationTree(trees: DebugTreeNode[], dependencyGraph: Record<string, string[]>): void {
    if (!this.config) {
      return;
    }
    this.trees = trees;
    this.dependencyGraph = dependencyGraph;
  }

  /**
   * Record the start of a calculation phase
   */
  recordPhaseStart(phase: string): void {
    if (!this.config) {
      return;
    }
    this.phaseStartTimes.set(phase, Date.now());
  }

  /**
   * Record the end of a calculation phase
   */
  recordPhaseEnd(phase: string): void {
    if (!this.config) {
      return;
    }
    const startTime = this.phaseStartTimes.get(phase);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.nodeExecutionTimes.set(`phase_${phase}`, duration);
      this.phaseStartTimes.delete(phase);
    }
  }

  getDebugInfo(): DebugInfo {
    if (!this.config) {
      return {
        calculationTree: {
          trees: [],
          executionOrder: [],
          totalNodes: 0,
          dependencyGraph: {},
          metricOrder: [],
        },
        calculationSteps: [],
        performanceMetrics: {
          totalExecutionTimeMs: 0,
          nodeExecutionTimes: {},
          cacheHitRate: 0,
          totalCacheHits: 0,
          totalCacheMisses: 0,
          phaseTimings: {
            validation: 0,
            treeProcessing: 0,
            calculation: 0,
            resultBuilding: 0,
          },
        },
      };
    }
    const totalCacheOperations = this.cacheStats.hits + this.cacheStats.misses;
    const cacheHitRate = totalCacheOperations > 0 ? (this.cacheStats.hits / totalCacheOperations) * 100 : 0;

    const calculationTree: DebugCalculationTree = {
      trees: this.trees,
      executionOrder: this.executionOrder,
      totalNodes: this.executionOrder.length,
      dependencyGraph: this.dependencyGraph,
      metricOrder: this.metricOrder
    };

    const performanceMetrics: DebugPerformanceMetrics = {
      totalExecutionTimeMs: this.nodeExecutionTimes.get('phase_total') || 0,
      nodeExecutionTimes: Object.fromEntries(
        Array.from(this.nodeExecutionTimes.entries()).filter(([key]) => !key.startsWith('phase_'))
      ),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalCacheHits: this.cacheStats.hits,
      totalCacheMisses: this.cacheStats.misses,
      phaseTimings: {
        validation: this.nodeExecutionTimes.get('phase_validation') || 0,
        treeProcessing: this.nodeExecutionTimes.get('phase_treeProcessing') || 0,
        calculation: this.nodeExecutionTimes.get('phase_calculation') || 0,
        resultBuilding: this.nodeExecutionTimes.get('phase_resultBuilding') || 0
      }
    };

    // Add memory usage if available and requested
    if (this.config.includeMemoryUsage && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      performanceMetrics.memoryUsageMB = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
    }

    return {
      calculationTree,
      calculationSteps: this.steps,
      performanceMetrics,
      warnings: this.warnings.length > 0 ? this.warnings : undefined,
      errors: this.errors.length > 0 ? this.errors : undefined
    };
  }

  reset(): void {
    this.steps = [];
    this.nodeExecutionTimes.clear();
    this.stepCounter = 0;
    this.phaseStartTimes.clear();
    this.cacheStats = { hits: 0, misses: 0 };
    this.warnings = [];
    this.errors = [];
    this.trees = [];
    this.executionOrder = [];
    this.dependencyGraph = {};
    this.metricOrder = [];
    this.currentTreeProcessing.clear();
  }

  /**
   * Convert a CalculationTreeNode to DebugTreeNode with additional debug information
   */
  convertTreeNodeToDebug(node: CalculationTreeNode, position?: { x: number; y: number }): DebugTreeNode {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeData: node.nodeData,
      children: node.children.map(child => this.convertTreeNodeToDebug(child)),
      inputOrder: node.inputOrder ? [...node.inputOrder] : undefined,
      position: position || { x: 0, y: 0 },
      label: this.extractNodeLabel(node),
      isReference: node.isReference
    };
  }

  /**
   * Extract a human-readable label from a calculation tree node
   */
  private extractNodeLabel(node: CalculationTreeNode): string {
    const nodeData = node.nodeData as any;
    
    switch (node.nodeType) {
      case 'METRIC':
        return nodeData?.label || 'Unnamed Metric';
      case 'DATA':
        return nodeData?.name || 'Data Node';
      case 'CONSTANT':
        return `Constant: ${nodeData?.value || 0}`;
      case 'OPERATOR':
        if (nodeData?.op === 'offset' && nodeData?.offsetMonths != null) {
          return `Operator: offset (${nodeData.offsetMonths}m)`;
        }
        return `Operator: ${nodeData?.op || 'Unknown'}`;
      case 'SEED':
        return 'Seed Node';
      default:
        return 'Unknown Node';
    }
  }
}
