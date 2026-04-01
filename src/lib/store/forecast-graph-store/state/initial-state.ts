import type { ForecastGraphState } from './index';
import { initialDebugState } from './debug-state';

export const initialState: ForecastGraphState = {
  forecastId: null,
  forecastName: '',
  forecastStartDate: null,
  forecastEndDate: null,
  organizationId: null,
  nodes: [],
  edges: [],
  isDirty: false,
  selectedNodeId: null,
  configPanelOpen: false,
  isLoading: false,
  error: null,
  organizationForecasts: [],
  
  // Last edited node position tracking
  lastEditedNodePosition: null,
  
  // Graph validation state
  graphValidation: null,
  isValidatingGraph: false,
  
  // Unified calculation results
  calculationResults: null,
  isCalculating: false,
  calculationError: null,
  lastCalculatedAt: null,
  
  // MM-YYYY period management
  forecastPeriods: null,
  
  // Visualization state  
  selectedVisualizationMonth: null,
  showVisualizationSlider: false,
  
  // Hydration state for Zustand v5 compatibility
  _hasHydrated: false,
  
  // Debug state
  ...initialDebugState,
};
