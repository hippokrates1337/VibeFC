/**
 * Debug Hooks for Forecast Graph Store
 * Provides access to debug state and actions
 */

import { useShallow } from 'zustand/shallow';
import { useMemo } from 'react';
import { useForecastGraphStore } from '../store';
import type {
  DebugCalculationRequest,
  DebugCalculationResult,
  DebugCalculationTree,
  DebugCalculationStep,
  CalculationType
} from '@/types/debug';

/**
 * Hook for accessing debug state
 * Provides debug calculation results, tree, steps, and UI state
 */
export const useDebug = () => {
  // Check if we're on the client side at runtime
  const isClient = typeof window !== 'undefined';
  
  // Return default state if not on client side
  if (!isClient) {
    return {
      // Debug data
      debugResults: null,
      calculationTree: null,
      calculationSteps: [],
      
      // UI selections
      selectedNode: null,
      selectedStep: null,
      selectedCalculationType: 'all' as const,
      
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
      viewMode: 'split' as const,
      expandedNodes: new Set(),
      
      // Last debug session info
      lastDebugAt: null,
      lastDebugForecastId: null
    };
  }

  return useForecastGraphStore(useShallow((state) => ({
    // Debug data
    debugResults: state.debugResults,
    calculationTree: state.calculationTree,
    calculationSteps: state.calculationSteps,
    
    // UI selections
    selectedNode: state.selectedNode,
    selectedStep: state.selectedStep,
    selectedCalculationType: state.selectedCalculationType,
    
    // State flags
    isDebugging: state.isDebugging,
    isLoadingTree: state.isLoadingTree,
    isLoadingSteps: state.isLoadingSteps,
    
    // Errors
    debugError: state.debugError,
    treeError: state.treeError,
    stepsError: state.stepsError,
    
    // Filters
    filters: state.filters,
    
    // View preferences
    viewMode: state.viewMode,
    expandedNodes: state.expandedNodes,
    
    // Last debug session info
    lastDebugAt: state.lastDebugAt,
    lastDebugForecastId: state.lastDebugForecastId
  })));
};

/**
 * Hook for accessing debug actions
 * Provides all debug-related actions and utilities
 */
export const useDebugActions = () => {
  // Check if we're on the client side at runtime
  const isClient = typeof window !== 'undefined';
  
  // Return no-op functions if not on client side
  if (!isClient) {
    return {
      // Debug calculation actions
      triggerDebugCalculation: async () => {},
      loadCalculationTree: async () => {},
      loadCalculationSteps: async () => {},
      
      // Debug data management
      setDebugResults: () => {},
      clearDebugData: () => {},
      
      // UI state management
      selectNode: () => {},
      selectStep: () => {},
      setSelectedCalculationType: () => {},
      toggleNodeExpansion: () => {},
      setAllNodesExpanded: () => {},
      setViewMode: () => {},
      
      // Filter management
      updateDebugFilters: () => {},
      resetDebugFilters: () => {},
      applyFilterPreset: () => {},
      
      // Data access helpers
      getFilteredSteps: () => [],
      getSelectedNodeDetails: () => null,
      getPerformanceSummary: () => null
    };
  }

  // Use Zustand v5 pattern with stable store reference
  const store = useForecastGraphStore();
  
  return useMemo(() => ({
    // Debug calculation actions
    triggerDebugCalculation: store.triggerDebugCalculation,
    loadCalculationTree: store.loadCalculationTree,
    loadCalculationSteps: store.loadCalculationSteps,
    
    // Debug data management
    setDebugResults: store.setDebugResults,
    clearDebugData: store.clearDebugData,
    
    // UI state management
    selectNode: store.selectNode,
    selectStep: store.selectStep,
    setSelectedCalculationType: store.setSelectedCalculationType,
    toggleNodeExpansion: store.toggleNodeExpansion,
    setAllNodesExpanded: store.setAllNodesExpanded,
    setViewMode: store.setViewMode,
    
    // Filter management
    updateDebugFilters: store.updateDebugFilters,
    resetDebugFilters: store.resetDebugFilters,
    applyFilterPreset: store.applyFilterPreset,
    
    // Data access helpers
    getFilteredSteps: store.getFilteredSteps,
    getSelectedNodeDetails: store.getSelectedNodeDetails,
    getPerformanceSummary: store.getPerformanceSummary
  }), [store]);
};

/**
 * Hook for computed debug values
 * Provides derived state and computed values
 */
export const useDebugComputed = () => {
  const debug = useDebug();
  const { getFilteredSteps, getSelectedNodeDetails, getPerformanceSummary } = useDebugActions();
  
  return useMemo(() => {
    const filteredSteps = getFilteredSteps();
    const selectedNodeDetails = getSelectedNodeDetails();
    const performanceSummary = getPerformanceSummary();
    
    // Compute additional derived values
    const hasDebugData = debug.debugResults !== null;
    const hasCalculationTree = debug.calculationTree !== null;
    const hasCalculationSteps = debug.calculationSteps.length > 0;
    
    const stepsByNodeType = filteredSteps.reduce((acc, step) => {
      acc[step.nodeType] = (acc[step.nodeType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const stepsByCalculationType = filteredSteps.reduce((acc, step) => {
      acc[step.calculationType] = (acc[step.calculationType] || 0) + 1;
      return acc;
    }, {} as Record<CalculationType, number>);
    
    const errorSteps = filteredSteps.filter(step => step.errorMessage);
    const totalExecutionTime = filteredSteps.reduce((sum, step) => sum + step.executionTimeMs, 0);
    
    return {
      // Basic state
      hasDebugData,
      hasCalculationTree,
      hasCalculationSteps,
      
      // Filtered data
      filteredSteps,
      filteredStepCount: filteredSteps.length,
      
      // Selected node details
      selectedNodeDetails,
      
      // Performance summary
      performanceSummary,
      
      // Statistics
      stepsByNodeType,
      stepsByCalculationType,
      errorSteps,
      errorCount: errorSteps.length,
      totalExecutionTime,
      
      // Availability flags
      canTriggerDebug: !debug.isDebugging && !!debug.debugResults?.forecastId,
      canLoadTree: !debug.isLoadingTree,
      canLoadSteps: !debug.isLoadingSteps,
      
      // Data freshness
      isDebugDataFresh: debug.lastDebugForecastId === debug.debugResults?.forecastId,
      debugAge: debug.lastDebugAt ? new Date().getTime() - new Date(debug.lastDebugAt).getTime() : null
    };
  }, [debug, getFilteredSteps, getSelectedNodeDetails, getPerformanceSummary]);
};

/**
 * Hook for debug configuration and preferences
 */
export const useDebugConfig = () => {
  return useMemo(() => {
    // Configuration values - could be moved to a separate config store
    return {
      maxStepsToDisplay: 1000,
      autoRefreshInterval: 30000, // 30 seconds
      defaultDebugLevel: 'detailed' as const,
      defaultCalculationTypes: ['historical', 'forecast', 'budget'] as CalculationType[],
      enablePerformanceMetrics: true,
      enableMemoryTracking: false,
      
      // UI preferences
      defaultViewMode: 'split' as const,
      autoExpandTree: false,
      showExecutionOrder: true,
      showPerformanceOverlay: true
    };
  }, []);
};
