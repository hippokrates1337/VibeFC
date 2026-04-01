import { Edge, Node, NodeChange, EdgeChange } from 'reactflow';
import type { Forecast as ClientForecastSummary } from '@/lib/api/forecast';
import type { 
  GraphValidationResult, 
  NodeVisualizationValue, 
  MergedTimeSeriesData, 
  MergedTimeSeriesValue,
  UnifiedCalculationResult,
  UnifiedCalculationRequest,
  ForecastPeriods,
  UpdatePeriodsRequest,
  UnifiedNodeResult,
  UnifiedMonthlyValue
} from '@/types/forecast';

// Define node types
export type ForecastNodeKind = 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

// Define node attribute interfaces
export interface DataNodeAttributes {
  name: string;
  variableId: string;
  offsetMonths: number;
}

export interface ConstantNodeAttributes {
  name: string;
  value: number;
}

export interface OperatorNodeAttributes {
  op: '+' | '-' | '*' | '/' | '^' | 'offset';
  inputOrder?: string[];
  /** Months to lag backward; used when op === 'offset' */
  offsetMonths?: number;
}

/** How calendar-year FY totals aggregate: stock = December point-in-time; flow = sum of months. */
export type MetricSeriesKind = 'stock' | 'flow';

export interface MetricNodeAttributes {
  label: string;
  budgetVariableId: string;
  historicalVariableId: string;
  useCalculated: boolean;
  /** Defaults to flow when omitted (backward compatible). */
  metricSeriesKind?: MetricSeriesKind;
}

export interface SeedNodeAttributes {
  sourceMetricId: string;
}

// Node data union type
export type ForecastNodeData = 
  | DataNodeAttributes 
  | ConstantNodeAttributes 
  | OperatorNodeAttributes 
  | MetricNodeAttributes 
  | SeedNodeAttributes;

// Use reactflow types directly with type parameters for better compatibility
export type ForecastNodeClient = Node<ForecastNodeData>;
export type ForecastEdgeClient = Edge;

// State interfaces


// Action parameter types
export interface LoadForecastParams {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  organizationId: string | null;
  nodes: ForecastNodeClient[];
  edges: ForecastEdgeClient[];
  /** MM-YYYY periods from GET /forecasts/:id (DB); overrides stale persisted store periods */
  forecastPeriods?: ForecastPeriods | null;
}

export interface ForecastMetadataUpdate {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface AddNodeParams {
  type: ForecastNodeKind;
  data: Partial<ForecastNodeData>;
  position?: { x: number; y: number };
}

// Action interfaces
export interface GraphActions {
  // Node management
  addNode: (nodeData: AddNodeParams) => string;
  updateNodeData: (nodeId: string, dataUpdates: Partial<ForecastNodeData>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNodeWithEdges: (nodeId: string) => string | null;
  
  // Edge management
  addEdge: (edge: Omit<ForecastEdgeClient, 'id'>) => string;
  deleteEdge: (edgeId: string) => void;
  
  // React Flow integration
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  
  // Graph utilities
  setDirty: (isDirty: boolean) => void;
  resetStore: () => void;
}

export interface CalculationActions {
  // Unified calculation (only approach)
  calculateUnified: (request?: Partial<UnifiedCalculationRequest>) => Promise<void>;
  loadUnifiedCalculationResults: () => Promise<void>;
  setUnifiedCalculationResults: (results: UnifiedCalculationResult | null) => void;
  clearCalculationResults: () => void;
  
  // Period management
  updateForecastPeriods: (periods: UpdatePeriodsRequest) => Promise<void>;
  setForecastPeriods: (periods: ForecastPeriods | null) => void;
  
  // Validation
  validateGraph: () => Promise<GraphValidationResult>;
  setGraphValidation: (validation: GraphValidationResult) => void;
  clearGraphValidation: () => void;
  
  // Data access
  getUnifiedNodeValueForMonth: (nodeId: string, month: string) => UnifiedMonthlyValue | null;
  getUnifiedMergedTimeSeriesData: (nodeId: string) => MergedTimeSeriesData | null;
}

export interface MetadataActions {
  loadForecast: (data: LoadForecastParams) => void;
  setForecastMetadata: (metadata: ForecastMetadataUpdate) => void;
  loadOrganizationForecasts: (forecasts: ClientForecastSummary[]) => void;
}

export interface UIActions {
  setSelectedNodeId: (nodeId: string | null) => void;
  setConfigPanelOpen: (open: boolean) => void;
  openConfigPanelForNode: (nodeId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedVisualizationMonth: (month: Date | null) => void;
  setShowVisualizationSlider: (show: boolean) => void;
  updateVisualizationMonthForPeriodChange: (newStartDate: string | null, newEndDate: string | null) => void;
  generateForecastMonths: (startDate: string, endDate: string) => Date[];
  getNodeValueForMonth: (nodeId: string, month: Date) => NodeVisualizationValue | null;
  // Hydration management for Zustand v5
  _setHasHydrated: (hasHydrated: boolean) => void;
}

export interface DebugActions {
  // Debug calculation actions
  triggerDebugCalculation: (request?: Partial<any>) => Promise<void>; // Using any for now to avoid circular imports
  loadCalculationTree: () => Promise<void>;
  loadCalculationSteps: () => Promise<void>;
  
  // Debug data management
  setDebugResults: (results: any | null) => void;
  clearDebugData: () => void;
  
  // UI state management
  selectNode: (nodeId: string | null) => void;
  selectStep: (stepNumber: number | null) => void;
  setSelectedCalculationType: (calcType: any) => void;
  toggleNodeExpansion: (nodeId: string) => void;
  setAllNodesExpanded: (expanded: boolean) => void;
  setViewMode: (mode: 'tree' | 'steps' | 'metrics' | 'split') => void;
  
  // Filter management
  updateDebugFilters: (filters: any) => void;
  resetDebugFilters: () => void;
  applyFilterPreset: (preset: any) => void;
  
  // Data access helpers
  getFilteredSteps: () => any[];
  getSelectedNodeDetails: () => any | null;
  getPerformanceSummary: () => any | null;
}

// Combined actions interface
export type AllActions = GraphActions & CalculationActions & MetadataActions & UIActions & DebugActions;

// Re-export types from forecast types for convenience
export type {
  GraphValidationResult,
  NodeVisualizationValue,
  MergedTimeSeriesData,
  MergedTimeSeriesValue,
  UnifiedCalculationResult,
  UnifiedCalculationRequest,
  ForecastPeriods,
  UpdatePeriodsRequest,
  UnifiedNodeResult,
  UnifiedMonthlyValue
} from '@/types/forecast';
