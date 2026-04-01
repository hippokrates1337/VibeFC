/**
 * Debug Types for Forecast Calculation System
 * Provides type definitions for debug instrumentation and data collection
 */

import { CalculationType, NodeType, CalculationTreeNode, CalculationContext } from '../services/calculation-engine/types/calculation-types';

// Re-export types for convenience
export type { CalculationType, NodeType, CalculationTreeNode, CalculationContext };

// ========================================
// Debug Configuration Types
// ========================================

export type DebugLevel = 'basic' | 'detailed' | 'verbose';

export interface DebugConfiguration {
  level: DebugLevel;
  includePerformanceMetrics: boolean;
  includeMemoryUsage: boolean;
  focusNodeIds?: string[];
  maxStepsToCapture?: number;
}

// ========================================
// Debug Step Types
// ========================================

export interface DebugCalculationStep {
  nodeId: string;
  nodeType: NodeType;
  stepNumber: number;
  month: string;
  calculationType: CalculationType;
  inputs: any[];
  output: number | null;
  executionTimeMs: number;
  dependencies: string[];
  errorMessage?: string;
  nodeAttributes?: any;
  timestamp: Date;
}

// ========================================
// Debug Tree Types
// ========================================

export interface DebugTreeNode {
  nodeId: string;
  nodeType: NodeType;
  nodeData: any;
  children: DebugTreeNode[];
  inputOrder?: string[];
  position: { x: number; y: number };
  label?: string;
  isReference?: boolean;
}

export interface DebugCalculationTree {
  trees: DebugTreeNode[];
  executionOrder: string[];
  totalNodes: number;
  dependencyGraph: Record<string, string[]>;
  metricOrder: string[];
}

// ========================================
// Debug Performance Types
// ========================================

export interface DebugPerformanceMetrics {
  totalExecutionTimeMs: number;
  nodeExecutionTimes: Record<string, number>;
  cacheHitRate: number;
  totalCacheHits: number;
  totalCacheMisses: number;
  memoryUsageMB?: number;
  phaseTimings: {
    validation: number;
    treeProcessing: number;
    calculation: number;
    resultBuilding: number;
  };
}

// ========================================
// Debug Context Types
// ========================================

export interface DebugContext extends CalculationContext {
  debugConfig: DebugConfiguration;
  debugSteps: DebugCalculationStep[];
  nodeExecutionTimes: Map<string, number>;
  stepCounter: number;
  startTime: Date;
  phaseStartTimes: Map<string, number>;
  cacheStats: {
    hits: number;
    misses: number;
  };
}

// ========================================
// Debug Result Types
// ========================================

export interface DebugInfo {
  calculationTree: DebugCalculationTree;
  calculationSteps: DebugCalculationStep[];
  performanceMetrics: DebugPerformanceMetrics;
  warnings?: string[];
  errors?: string[];
}

export interface DebugCalculationResult {
  id: string;
  forecastId: string;
  calculatedAt: string;
  calculationTypes: CalculationType[];
  periodInfo: {
    forecastStartMonth: string;
    forecastEndMonth: string;
    actualStartMonth: string;
    actualEndMonth: string;
  };
  metrics: any[];
  allNodes?: any[];
  debugInfo: DebugInfo;
}

// ========================================
// Debug Request Types
// ========================================

export interface DebugCalculationRequest {
  calculationTypes: CalculationType[];
  includeIntermediateNodes?: boolean;
  debugLevel?: DebugLevel;
  includePerformanceMetrics?: boolean;
  includeMemoryUsage?: boolean;
  focusNodeIds?: string[];
}

// ========================================
// Debug Instrumentation Types
// ========================================

export interface NodeExecutionInfo {
  nodeId: string;
  startTime: number;
  endTime: number;
  inputs: any[];
  output: number | null;
  errorMessage?: string;
  cacheHit: boolean;
}

export interface TreeProcessingInfo {
  treeId: string;
  nodeCount: number;
  processingOrder: string[];
  startTime: number;
  endTime: number;
}

// ========================================
// Debug Event Types
// ========================================

export type DebugEventType = 
  | 'calculation_start'
  | 'calculation_end'
  | 'tree_start'
  | 'tree_end'
  | 'node_start'
  | 'node_end'
  | 'cache_hit'
  | 'cache_miss'
  | 'error'
  | 'warning';

export interface DebugEvent {
  type: DebugEventType;
  timestamp: Date;
  nodeId?: string;
  treeId?: string;
  data?: any;
  message?: string;
}

// ========================================
// Debug Collector Interface
// ========================================

export interface DebugCollector {
  startCalculation(config: DebugConfiguration): void;
  endCalculation(): void;
  recordPhaseStart(phase: string): void;
  recordPhaseEnd(phase: string): void;
  startTree(treeId: string): void;
  endTree(treeId: string): void;
  startNode(nodeId: string, nodeType: NodeType): void;
  endNode(nodeId: string, result: NodeExecutionInfo): void;
  recordStep(step: DebugCalculationStep): void;
  recordCacheHit(nodeId: string): void;
  recordCacheMiss(nodeId: string): void;
  recordError(context: string, error: string): void;
  recordWarning(message: string): void;
  getDebugInfo(): DebugInfo;
  reset(): void;
}
