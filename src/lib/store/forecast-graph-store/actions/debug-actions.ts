/**
 * Debug Actions for Forecast Graph Store
 * Handles debug calculation operations and state management
 */

import { 
  debugCalculationApi, 
  createDefaultDebugRequest,
  type DebugCalculationRequest,
  type DebugCalculationResult,
  type DebugCalculationTree,
  type DebugCalculationStep,
  type CalculationType
} from '@/lib/api/debug-calculation';
import type { DebugFilters } from '@/types/debug';

const logger = console;

export const createDebugActions = (set: (partial: any) => void, get: () => any) => ({
  // ========================================
  // Debug Calculation Actions
  // ========================================

  /**
   * Trigger debug calculation for the current forecast
   */
  triggerDebugCalculation: async (request?: Partial<DebugCalculationRequest>) => {
    const state = get();
    
    if (!state.forecastId) {
      throw new Error('No forecast selected for debug calculation');
    }
    
    try {
      set({ isDebugging: true, debugError: null });
      
      // Create debug request with defaults
      const debugRequest: DebugCalculationRequest = {
        ...createDefaultDebugRequest(),
        ...request
      };
      
      logger.log(`[DebugActions] Starting debug calculation for forecast ${state.forecastId}:`, debugRequest);
      
      // Trigger debug calculation
      const result = await debugCalculationApi.calculateWithDebug(state.forecastId, debugRequest);
      
      // Update state with results
      set({
        debugResults: result,
        calculationTree: result.debugInfo.calculationTree,
        calculationSteps: result.debugInfo.calculationSteps,
        lastDebugAt: result.calculatedAt,
        lastDebugForecastId: result.forecastId,
        isDebugging: false,
        debugError: null
      });
      
      logger.log('[DebugActions] Debug calculation completed successfully');
      logger.log(`[DebugActions] Captured ${result.debugInfo.calculationSteps.length} steps`);
      logger.log(`[DebugActions] Total execution time: ${result.debugInfo.performanceMetrics.totalExecutionTimeMs}ms`);
      
    } catch (error) {
      logger.error('[DebugActions] Debug calculation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown debug calculation error';
      set({
        debugError: errorMessage,
        isDebugging: false
      });
      throw error;
    }
  },

  /**
   * Load calculation tree structure without full calculation
   */
  loadCalculationTree: async () => {
    const state = get();
    
    if (!state.forecastId) {
      throw new Error('No forecast selected for tree loading');
    }
    
    try {
      set({ isLoadingTree: true, treeError: null });
      
      logger.log(`[DebugActions] Loading calculation tree for forecast ${state.forecastId}`);
      
      const tree = await debugCalculationApi.getCalculationTree(state.forecastId);
      
      set({
        calculationTree: tree,
        isLoadingTree: false,
        treeError: null
      });
      
      logger.log('[DebugActions] Calculation tree loaded successfully');
      logger.log(`[DebugActions] Tree contains ${tree.totalNodes} nodes across ${tree.trees.length} metric trees`);
      
    } catch (error) {
      logger.error('[DebugActions] Failed to load calculation tree:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown tree loading error';
      set({
        treeError: errorMessage,
        isLoadingTree: false
      });
      throw error;
    }
  },

  /**
   * Load calculation steps from last debug calculation
   */
  loadCalculationSteps: async () => {
    const state = get();
    
    if (!state.forecastId) {
      throw new Error('No forecast selected for steps loading');
    }
    
    try {
      set({ isLoadingSteps: true, stepsError: null });
      
      logger.log(`[DebugActions] Loading calculation steps for forecast ${state.forecastId}`);
      
      const steps = await debugCalculationApi.getCalculationSteps(state.forecastId);
      
      set({
        calculationSteps: steps,
        isLoadingSteps: false,
        stepsError: null
      });
      
      logger.log('[DebugActions] Calculation steps loaded successfully');
      logger.log(`[DebugActions] Loaded ${steps.length} calculation steps`);
      
    } catch (error) {
      logger.error('[DebugActions] Failed to load calculation steps:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown steps loading error';
      set({
        stepsError: errorMessage,
        isLoadingSteps: false
      });
      throw error;
    }
  },

  // ========================================
  // Debug Data Management
  // ========================================

  /**
   * Set debug calculation results
   */
  setDebugResults: (results: DebugCalculationResult | null) => {
    set({
      debugResults: results,
      calculationTree: results?.debugInfo.calculationTree || null,
      calculationSteps: results?.debugInfo.calculationSteps || [],
      lastDebugAt: results?.calculatedAt || null,
      lastDebugForecastId: results?.forecastId || null
    });
  },

  /**
   * Clear all debug data
   */
  clearDebugData: () => {
    set({
      debugResults: null,
      calculationTree: null,
      calculationSteps: [],
      selectedNode: null,
      selectedStep: null,
      debugError: null,
      treeError: null,
      stepsError: null,
      lastDebugAt: null,
      lastDebugForecastId: null
    });
  },

  // ========================================
  // UI State Management
  // ========================================

  /**
   * Select a node for detailed view
   */
  selectNode: (nodeId: string | null) => {
    set({ selectedNode: nodeId });
  },

  /**
   * Select a calculation step
   */
  selectStep: (stepNumber: number | null) => {
    set({ selectedStep: stepNumber });
  },

  /**
   * Set selected calculation type filter
   */
  setSelectedCalculationType: (calcType: CalculationType | 'all') => {
    set({ selectedCalculationType: calcType });
  },

  /**
   * Toggle node expansion in tree view
   */
  toggleNodeExpansion: (nodeId: string) => {
    const state = get();
    const expandedNodes = new Set(state.expandedNodes);
    
    if (expandedNodes.has(nodeId)) {
      expandedNodes.delete(nodeId);
    } else {
      expandedNodes.add(nodeId);
    }
    
    set({ expandedNodes });
  },

  /**
   * Expand or collapse all nodes
   */
  setAllNodesExpanded: (expanded: boolean) => {
    const state = get();
    const expandedNodes = new Set<string>();
    
    if (expanded && state.calculationTree) {
      // Add all node IDs to expanded set
      const addNodeIds = (nodes: any[]) => {
        nodes.forEach(node => {
          expandedNodes.add(node.nodeId);
          if (node.children && node.children.length > 0) {
            addNodeIds(node.children);
          }
        });
      };
      
      addNodeIds(state.calculationTree.trees);
    }
    
    set({ expandedNodes });
  },

  /**
   * Set view mode
   */
  setViewMode: (mode: 'tree' | 'steps' | 'metrics' | 'split') => {
    set({ viewMode: mode });
  },

  // ========================================
  // Filter Management
  // ========================================

  /**
   * Update debug filters
   */
  updateDebugFilters: (filters: Partial<DebugFilters>) => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        ...filters
      }
    });
  },

  /**
   * Reset debug filters to defaults
   */
  resetDebugFilters: () => {
    set({
      filters: {
        nodeTypes: new Set(),
        calculationTypes: new Set(),
        monthRange: {},
        executionTimeRange: {},
        showErrorsOnly: false,
        searchTerm: ''
      }
    });
  },

  /**
   * Apply filter preset
   */
  applyFilterPreset: (preset: { filters: DebugFilters }) => {
    set({ filters: preset.filters });
  },

  // ========================================
  // Data Access Helpers
  // ========================================

  /**
   * Get filtered calculation steps
   */
  getFilteredSteps: (): DebugCalculationStep[] => {
    const state = get();
    const { calculationSteps, filters } = state;
    
    return calculationSteps.filter(step => {
      // Filter by node types
      if (filters.nodeTypes.size > 0 && !filters.nodeTypes.has(step.nodeType)) {
        return false;
      }
      
      // Filter by calculation types
      if (filters.calculationTypes.size > 0 && !filters.calculationTypes.has(step.calculationType)) {
        return false;
      }
      
      // Filter by search term
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          step.nodeId.toLowerCase().includes(searchLower) ||
          step.nodeType.toLowerCase().includes(searchLower) ||
          step.month.toLowerCase().includes(searchLower) ||
          (step.errorMessage && step.errorMessage.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) {
          return false;
        }
      }
      
      // Filter by errors only
      if (filters.showErrorsOnly && !step.errorMessage) {
        return false;
      }
      
      // Filter by execution time range
      if (filters.executionTimeRange.min !== undefined && step.executionTimeMs < filters.executionTimeRange.min) {
        return false;
      }
      if (filters.executionTimeRange.max !== undefined && step.executionTimeMs > filters.executionTimeRange.max) {
        return false;
      }
      
      return true;
    });
  },

  /**
   * Get node details for selected node
   */
  getSelectedNodeDetails: () => {
    const state = get();
    const { selectedNode, calculationTree, calculationSteps } = state;
    
    if (!selectedNode || !calculationTree) {
      return null;
    }
    
    // Find node in tree
    const findNode = (nodes: any[]): any => {
      for (const node of nodes) {
        if (node.nodeId === selectedNode) {
          return node;
        }
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNode(calculationTree.trees);
    if (!node) return null;
    
    // Get related steps
    const nodeSteps = calculationSteps.filter(step => step.nodeId === selectedNode);
    
    return {
      node,
      steps: nodeSteps,
      totalExecutionTime: nodeSteps.reduce((sum, step) => sum + step.executionTimeMs, 0),
      errorCount: nodeSteps.filter(step => step.errorMessage).length
    };
  },

  /**
   * Get performance summary
   */
  getPerformanceSummary: () => {
    const state = get();
    const { debugResults } = state;
    
    if (!debugResults) {
      return null;
    }
    
    const { performanceMetrics, calculationSteps } = debugResults.debugInfo;
    
    // Calculate additional metrics
    const stepsByNode = calculationSteps.reduce((acc, step) => {
      if (!acc[step.nodeId]) {
        acc[step.nodeId] = [];
      }
      acc[step.nodeId].push(step);
      return acc;
    }, {} as Record<string, DebugCalculationStep[]>);
    
    const nodeStats = Object.entries(stepsByNode).map(([nodeId, steps]) => ({
      nodeId,
      stepCount: steps.length,
      totalTime: steps.reduce((sum, step) => sum + step.executionTimeMs, 0),
      averageTime: steps.reduce((sum, step) => sum + step.executionTimeMs, 0) / steps.length,
      errorCount: steps.filter(step => step.errorMessage).length
    }));
    
    return {
      metrics: performanceMetrics,
      nodeStats,
      totalSteps: calculationSteps.length,
      totalErrors: calculationSteps.filter(step => step.errorMessage).length,
      slowestNodes: nodeStats.sort((a, b) => b.totalTime - a.totalTime).slice(0, 5)
    };
  }
});
