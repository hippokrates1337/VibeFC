/**
 * Debug State for Forecast Graph Store
 * Manages debug calculation data and UI state
 */

import type {
  DebugCalculationResult,
  DebugCalculationTree,
  DebugCalculationStep,
  CalculationType,
  DebugUIState,
  DebugFilters
} from '@/types/debug';

export interface DebugState {
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
  
  // Last debug session info
  lastDebugAt: string | null;
  lastDebugForecastId: string | null;
}

export const initialDebugState: DebugState = {
  // Debug data
  debugResults: null,
  calculationTree: null,
  calculationSteps: [],
  
  // UI selections
  selectedNode: null,
  selectedStep: null,
  selectedCalculationType: 'all',
  
  // State flags
  isDebugging: false,
  isLoadingTree: false,
  isLoadingSteps: false,
  
  // Errors
  debugError: null,
  treeError: null,
  stepsError: null,
  
  // Filters
  filters: {
    nodeTypes: new Set(),
    calculationTypes: new Set(),
    monthRange: {},
    executionTimeRange: {},
    showErrorsOnly: false,
    searchTerm: ''
  },
  
  // View preferences
  viewMode: 'split',
  expandedNodes: new Set(),
  
  // Last debug session info
  lastDebugAt: null,
  lastDebugForecastId: null
};
