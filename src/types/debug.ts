/**
 * Frontend Debug Types
 * Types for the debug calculation system frontend interface
 */

import type { DebugCalculationTree } from '@/lib/api/debug-calculation';

// Re-export types from the API for consistency
export type {
  DebugLevel,
  CalculationType,
  DebugCalculationRequest,
  DebugCalculationStep,
  DebugTreeNode,
  DebugCalculationTree,
  DebugPerformanceMetrics,
  DebugInfo,
  DebugCalculationResult
} from '@/lib/api/debug-calculation';

// ========================================
// UI State Types
// ========================================

export interface DebugUIState {
  // Debug data
  debugResults: DebugCalculationResult | null;
  calculationTree: DebugCalculationTree | null;
  calculationSteps: DebugCalculationStep[];
  
  // UI selections
  selectedNode: string | null;
  selectedStep: number | null;
  selectedCalculationType: CalculationType | 'all';
  
  // State flags
  isDebugging: boolean;
  isLoadingTree: boolean;
  isLoadingSteps: boolean;
  
  // Errors
  debugError: string | null;
  treeError: string | null;
  stepsError: string | null;
  
  // Filters
  filters: DebugFilters;
  
  // View preferences
  viewMode: 'tree' | 'steps' | 'metrics' | 'split';
  expandedNodes: Set<string>;
}

export interface DebugFilters {
  nodeTypes: Set<string>;
  calculationTypes: Set<CalculationType>;
  monthRange: {
    start?: string;
    end?: string;
  };
  executionTimeRange: {
    min?: number;
    max?: number;
  };
  showErrorsOnly: boolean;
  searchTerm: string;
}

// ========================================
// Component Props Types
// ========================================

export interface DebugPageProps {
  // Page level props if needed
}

export interface CalculationTreeVisualizationProps {
  tree: DebugCalculationTree;
  selectedNode?: string;
  onNodeSelect: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  highlightedNodes?: Set<string>;
  expandedNodes?: Set<string>;
  onNodeToggle?: (nodeId: string) => void;
}

export interface StepExecutionLogProps {
  steps: DebugCalculationStep[];
  selectedStep?: number;
  onStepSelect: (stepNumber: number) => void;
  filters?: DebugFilters;
  onFiltersChange?: (filters: DebugFilters) => void;
  /** When set, node labels are resolved for display and search. */
  calculationTree?: DebugCalculationTree | null;
}

export interface NodeDebugDetailsProps {
  nodeId: string;
  debugResults: DebugCalculationResult;
  calculationTree: DebugCalculationTree;
}

export interface PerformanceMetricsProps {
  metrics: DebugPerformanceMetrics;
  onNodeFocus?: (nodeId: string) => void;
}

// ========================================
// Visualization Types
// ========================================

export interface TreeNodePosition {
  x: number;
  y: number;
}

export interface TreeLayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  marginTop: number;
  marginLeft: number;
}

export interface NodeVisualization {
  id: string;
  type: string;
  label: string;
  position: TreeNodePosition;
  color: string;
  isSelected: boolean;
  isHighlighted: boolean;
  isExpanded: boolean;
  executionOrder?: number;
  executionTime?: number;
  hasError: boolean;
}

export interface EdgeVisualization {
  id: string;
  source: string;
  target: string;
  isHighlighted: boolean;
}

// ========================================
// Export Types
// ========================================

export type ExportFormat = 'json' | 'xlsx';

export interface ExportOptions {
  format: ExportFormat;
  includeSteps: boolean;
  includeTree: boolean;
  includeMetrics: boolean;
  includeErrors: boolean;
  filters?: DebugFilters;
}

export interface ExportData {
  forecastId: string;
  exportedAt: string;
  calculationTypes: CalculationType[];
  debugLevel: DebugLevel;
  totalSteps: number;
  totalNodes: number;
  totalExecutionTime: number;
  data: {
    steps?: DebugCalculationStep[];
    tree?: DebugCalculationTree;
    metrics?: DebugPerformanceMetrics;
    errors?: string[];
    warnings?: string[];
  };
}

// ========================================
// Search and Filter Types
// ========================================

export interface SearchResult {
  type: 'node' | 'step' | 'error';
  id: string;
  title: string;
  description: string;
  score: number;
  context?: any;
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: DebugFilters;
}

// ========================================
// Analysis Types
// ========================================

export interface NodeAnalysis {
  nodeId: string;
  nodeType: string;
  totalExecutionTime: number;
  averageExecutionTime: number;
  stepCount: number;
  errorCount: number;
  cacheHitRate: number;
  bottleneckScore: number; // 0-100, higher = bigger bottleneck
}

export interface CalculationAnalysis {
  totalExecutionTime: number;
  totalSteps: number;
  errorRate: number;
  cacheHitRate: number;
  slowestNodes: NodeAnalysis[];
  bottlenecks: NodeAnalysis[];
  mostActiveMonths: string[];
  phaseBreakdown: Record<string, number>;
}

// ========================================
// Configuration Types
// ========================================

export interface DebugConfiguration {
  // Display preferences
  autoExpandTree: boolean;
  showExecutionOrder: boolean;
  showPerformanceOverlay: boolean;
  maxStepsToDisplay: number;
  
  // Performance
  virtualScrolling: boolean;
  lazyLoadSteps: boolean;
  updateFrequency: number;
  
  // Visualization
  treeLayout: TreeLayoutConfig;
  colorScheme: 'light' | 'dark' | 'auto';
  animationSpeed: 'slow' | 'normal' | 'fast' | 'none';
}

export const DEFAULT_DEBUG_CONFIG: DebugConfiguration = {
  autoExpandTree: false,
  showExecutionOrder: true,
  showPerformanceOverlay: true,
  maxStepsToDisplay: 1000,
  virtualScrolling: true,
  lazyLoadSteps: false,
  updateFrequency: 500,
  treeLayout: {
    nodeWidth: 180,
    nodeHeight: 60,
    horizontalSpacing: 240,
    verticalSpacing: 100,
    marginTop: 50,
    marginLeft: 50
  },
  colorScheme: 'auto',
  animationSpeed: 'normal'
};
