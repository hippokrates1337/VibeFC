import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Edge, Node, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import type { Forecast as ClientForecastSummary } from '@/lib/api/forecast';
import { logger } from '@/lib/utils/logger';
import type { GraphValidationResult, ForecastCalculationResult } from '@/types/forecast';
import { GraphConverter } from '@/lib/services/forecast-calculation/graph-converter';
import { forecastCalculationApi } from '@/lib/api/forecast-calculation';
import { useVariableStore } from './variables';

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
  op: '+' | '-' | '*' | '/' | '^';
  inputOrder?: string[];
}

export interface MetricNodeAttributes {
  label: string;
  budgetVariableId: string;
  historicalVariableId: string;
  useCalculated: boolean;
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

// Main store state
interface ForecastGraphState {
  forecastId: string | null;
  forecastName: string;
  forecastStartDate: string | null;
  forecastEndDate: string | null;
  organizationId: string | null;
  nodes: ForecastNodeClient[];
  edges: ForecastEdgeClient[];
  isDirty: boolean;
  selectedNodeId: string | null;
  configPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  organizationForecasts: ClientForecastSummary[];
  
  // NEW: Last edited node position tracking
  lastEditedNodePosition: { x: number; y: number } | null;
  
  // NEW: Graph validation state
  graphValidation: GraphValidationResult | null;
  isValidatingGraph: boolean;
  
  // NEW: Calculation results
  calculationResults: ForecastCalculationResult | null;
  isCalculating: boolean;
  calculationError: string | null;
  lastCalculatedAt: Date | null;
}

// Store actions
interface ForecastGraphActions {
  loadForecast: (data: { 
    id: string; 
    name: string; 
    startDate: string; 
    endDate: string; 
    organizationId: string | null;
    nodes: ForecastNodeClient[]; 
    edges: ForecastEdgeClient[] 
  }) => void;
  setForecastMetadata: (metadata: { 
    name?: string; 
    startDate?: string; 
    endDate?: string 
  }) => void;
  addNode: (nodeData: { 
    type: ForecastNodeKind; 
    data: Partial<ForecastNodeData>; 
    position?: { x: number; y: number } 
  }) => string;
  updateNodeData: (nodeId: string, dataUpdates: Partial<ForecastNodeData>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: Omit<ForecastEdgeClient, 'id'>) => string;
  deleteEdge: (edgeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setDirty: (isDirty: boolean) => void;
  resetStore: () => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setConfigPanelOpen: (open: boolean) => void;
  openConfigPanelForNode: (nodeId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  duplicateNodeWithEdges: (nodeId: string) => string | null;
  loadOrganizationForecasts: (forecasts: ClientForecastSummary[]) => void;
  
  // Last edited node position tracking
  updateLastEditedNodePosition: (position: { x: number; y: number }) => void;
  
  // Graph validation actions
  validateGraph: () => Promise<GraphValidationResult>;
  setGraphValidation: (validation: GraphValidationResult) => void;
  clearGraphValidation: () => void;
  setValidatingGraph: (isValidating: boolean) => void;
  
  // Calculation actions (only allowed when graph is valid)
  calculateForecast: () => Promise<void>;
  loadCalculationResults: () => Promise<void>;
  setCalculationResults: (results: ForecastCalculationResult) => void;
  clearCalculationResults: () => void;
  setCalculating: (isCalculating: boolean) => void;
  setCalculationError: (error: string | null) => void;
}

// Helper functions
const getDefaultNodeData = (type: ForecastNodeKind): ForecastNodeData => {
  switch (type) {
    case 'DATA':
      return { name: 'New Data Node', variableId: '', offsetMonths: 0 };
    case 'CONSTANT':
      return { name: 'New Constant', value: 0 };
    case 'OPERATOR':
      return { op: '+', inputOrder: [] };
    case 'METRIC':
      return { label: 'New Metric', budgetVariableId: '', historicalVariableId: '', useCalculated: false };
    case 'SEED':
      return { sourceMetricId: '' };
    default:
      return { name: 'New Constant', value: 0 };
  }
};

/**
 * Updates the inputOrder arrays for all operator nodes based on the current edges.
 * This ensures that operator nodes display the correct number of connected inputs.
 */
const updateOperatorInputOrders = (nodes: ForecastNodeClient[], edges: ForecastEdgeClient[]): ForecastNodeClient[] => {
  return nodes.map(node => {
    if (node.type === 'OPERATOR') {
      // Find all edges that target this operator node
      const incomingEdges = edges.filter(edge => edge.target === node.id);
      // Extract the source node IDs to create the inputOrder array
      const inputOrder = incomingEdges.map(edge => edge.source);
      
      // Create a completely new node object to ensure React detects the change
      const updatedNode: ForecastNodeClient = {
        ...node,
        data: {
          ...(node.data as OperatorNodeAttributes),
          inputOrder,
        },
      };
      
      return updatedNode;
    }
    return node;
  });
};

/**
 * Clean up orphaned SEED node references and return cleaned nodes
 * Only cleans if the referenced metric ID is a placeholder pattern or definitely invalid
 */
const cleanOrphanedReferences = (
  nodes: ForecastNodeClient[], 
  edges: ForecastEdgeClient[]
): { cleanedNodes: ForecastNodeClient[]; hadOrphanedRefs: boolean } => {
  const metricNodeIds = new Set(nodes.filter(n => n.type === 'METRIC').map(n => n.id));
  let hadOrphanedRefs = false;
  
  const cleanedNodes = nodes.map(node => {
    if (node.type === 'SEED') {
      const seedData = node.data as SeedNodeAttributes;
      
      // Check if the referenced metric exists
      if (seedData.sourceMetricId && !metricNodeIds.has(seedData.sourceMetricId)) {
        // Only clean up if this is clearly a stale reference (UUID pattern but not found)
        // This prevents accidentally clearing legitimate temporary references
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seedData.sourceMetricId);
        
        if (isValidUUID) {
          hadOrphanedRefs = true;
          console.warn(`[ForecastGraphStore] Cleaning orphaned SEED reference: ${seedData.sourceMetricId} not found in current metrics`);
          
          // Reset the sourceMetricId to empty string
          const cleanedData: SeedNodeAttributes = {
            sourceMetricId: ''
          };
          
          return {
            ...node,
            data: cleanedData
          };
        }
      }
    }
    return node;
  });
  
  return { cleanedNodes, hadOrphanedRefs };
};

// Initial state
const initialState: ForecastGraphState = {
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
  
  // NEW: Last edited node position tracking
  lastEditedNodePosition: null,
  
  // NEW: Graph validation state
  graphValidation: null,
  isValidatingGraph: false,
  
  // NEW: Calculation results
  calculationResults: null,
  isCalculating: false,
  calculationError: null,
  lastCalculatedAt: null,
};

// Create store with persist middleware
export const useForecastGraphStore = create<ForecastGraphState & ForecastGraphActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      loadForecast: (data) => {
        logger.log('[ForecastGraphStore] loadForecast called with:', data);
        
        // Clean up orphaned references before loading
        const { cleanedNodes, hadOrphanedRefs } = cleanOrphanedReferences(data.nodes, data.edges);
        
        if (hadOrphanedRefs) {
          logger.warn('[ForecastGraphStore] Cleaned up orphaned SEED node references during load');
        }
        
        set({
          forecastId: data.id,
          forecastName: data.name,
          forecastStartDate: data.startDate,
          forecastEndDate: data.endDate,
          organizationId: data.organizationId,
          nodes: cleanedNodes,
          edges: data.edges,
          isDirty: false, // Fresh data from server should not be dirty
          isLoading: false,
          error: null,
        });
        logger.log('[ForecastGraphStore] Forecast loaded and store updated.');
      },

      setForecastMetadata: (metadata) => {
        logger.log('[ForecastGraphStore] setForecastMetadata called with:', metadata);
        set((state) => {
          const newState = {
            forecastName: metadata.name ?? state.forecastName,
            forecastStartDate: metadata.startDate ?? state.forecastStartDate,
            forecastEndDate: metadata.endDate ?? state.forecastEndDate,
            isDirty: true,
          };
          logger.log('[ForecastGraphStore] Forecast metadata updated.', newState);
          return newState;
        });
      },

      addNode: (nodeData) => {
        logger.log('[ForecastGraphStore] addNode called with:', nodeData);
        const id = uuidv4();
        const position = nodeData.position ?? { x: 100, y: 100 };
        const defaultData = getDefaultNodeData(nodeData.type);
        const newNode: ForecastNodeClient = {
          id,
          type: nodeData.type,
          position,
          data: { ...defaultData, ...nodeData.data },
        };

        set((state) => {
          const newNodes = [...state.nodes, newNode];
          logger.log('[ForecastGraphStore] Node added:', newNode);
          return {
            nodes: newNodes,
            isDirty: true,
            lastEditedNodePosition: position,
          };
        });

        return id;
      },

      updateNodeData: (nodeId, dataUpdates) => {
        logger.log(`[ForecastGraphStore] updateNodeData called for nodeId: ${nodeId} with updates:`, dataUpdates);
        set((state) => {
          const targetNode = state.nodes.find(node => node.id === nodeId);
          return {
            nodes: state.nodes.map((node) => 
              node.id === nodeId 
                ? { ...node, data: { ...node.data, ...dataUpdates } } 
                : node
            ),
            isDirty: true,
            lastEditedNodePosition: targetNode ? targetNode.position : state.lastEditedNodePosition,
          };
        });
        logger.log(`[ForecastGraphStore] Node data updated for nodeId: ${nodeId}`);
      },

      updateNodePosition: (nodeId, position) => {
        logger.log(`[ForecastGraphStore] updateNodePosition called for nodeId: ${nodeId} with position:`, position);
        set((state) => ({
          nodes: state.nodes.map((node) => 
            node.id === nodeId 
              ? { ...node, position } 
              : node
          ),
          isDirty: true,
          lastEditedNodePosition: position,
        }));
        logger.log(`[ForecastGraphStore] Node position updated for nodeId: ${nodeId}`);
      },

      deleteNode: (nodeId) => {
        logger.log(`[ForecastGraphStore] deleteNode called for nodeId: ${nodeId}`);
        set((state) => {
          const filteredNodes = state.nodes.filter((node) => node.id !== nodeId);
          const filteredEdges = state.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          );
          const updatedNodes = updateOperatorInputOrders(filteredNodes, filteredEdges);
          
          logger.log(`[ForecastGraphStore] Node deleted: ${nodeId} and associated edges.`);
          return {
            nodes: updatedNodes,
            edges: filteredEdges,
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
            isDirty: true,
          };
        });
      },

      addEdge: (edge) => {
        logger.log('[ForecastGraphStore] addEdge called with:', edge);
        const id = uuidv4();
        const newEdge: ForecastEdgeClient = {
          ...edge,
          id,
        };

        set((state) => {
          const newEdges = [...state.edges, newEdge];
          const updatedNodes = updateOperatorInputOrders(state.nodes, newEdges);
          
          logger.log('[ForecastGraphStore] Edge added:', newEdge);
          
          return {
            edges: newEdges,
            nodes: updatedNodes,
            isDirty: true,
          };
        });

        return id;
      },

      deleteEdge: (edgeId) => {
        logger.log(`[ForecastGraphStore] deleteEdge called for edgeId: ${edgeId}`);
        set((state) => {
          const newEdges = state.edges.filter((edge) => edge.id !== edgeId);
          const updatedNodes = updateOperatorInputOrders(state.nodes, newEdges);
          
          logger.log(`[ForecastGraphStore] Edge deleted: ${edgeId}`);
          return {
            edges: newEdges,
            nodes: updatedNodes,
            isDirty: true,
          };
        });
      },

      onNodesChange: (changes) => {
        // logger.log('[ForecastGraphStore] onNodesChange called with changes:', changes); // Can be very noisy
        set((state) => {
          const newNodes = applyNodeChanges(changes, state.nodes) as ForecastNodeClient[];
          
          // Only mark as dirty for structural changes that affect calculation
          // Position, dimensions, and selection don't affect graph calculation results
          const dirty = changes.some(change => 
            change.type === 'remove' ||
            change.type === 'add'
          );
          
          // Track position changes for smart node placement
          let lastEditedNodePosition = state.lastEditedNodePosition;
          
          // Find position changes that have a defined position
          // We track both during dragging and when dragging ends to ensure we capture the position
          const positionChanges = changes.filter(change => 
            change.type === 'position' && 
            change.position !== undefined
          );
          
          if (positionChanges.length > 0) {
            // Take the position of the last moved node
            const lastPositionChange = positionChanges[positionChanges.length - 1];
            if (lastPositionChange.type === 'position' && lastPositionChange.position) {
              lastEditedNodePosition = lastPositionChange.position;
              logger.log('[ForecastGraphStore] Node position changed, updating last edited position:', {
                nodeId: lastPositionChange.id,
                position: lastPositionChange.position,
                dragging: lastPositionChange.dragging
              });
            }
          }
          
          if (dirty) {
            // logger.log('[ForecastGraphStore] Nodes structurally changed, setting isDirty to true.');
          }
          
          return {
            nodes: newNodes,
            isDirty: dirty ? true : state.isDirty,
            lastEditedNodePosition,
          };
        });
      },

      onEdgesChange: (changes) => {
        // logger.log('[ForecastGraphStore] onEdgesChange called with changes:', changes); // Can be very noisy
        set((state) => {
          const newEdges = applyEdgeChanges(changes, state.edges) as ForecastEdgeClient[];
          const hasEdgeChanges = changes.some(change => change.type === 'remove' || change.type === 'add');
          const updatedNodes = hasEdgeChanges ? updateOperatorInputOrders(state.nodes, newEdges) : state.nodes;
          
          const dirty = changes.some(change => change.type === 'remove');
          if (dirty) {
            // logger.log('[ForecastGraphStore] Edges changed, setting isDirty to true.');
          }
          return {
            edges: newEdges,
            nodes: updatedNodes,
            isDirty: dirty ? true : state.isDirty,
          };
        });
      },

      setDirty: (isDirty) => {
        logger.log(`[ForecastGraphStore] setDirty called with: ${isDirty}`);
        set({ isDirty });
      },

      // Resets the forecast editing state (nodes, edges, metadata) while preserving
      // the organization forecasts list to prevent clearing the forecast list when
      // navigating back from the editor to the forecast list page.
      resetStore: () => {
        logger.log('[ForecastGraphStore] resetStore called.');
        set((state) => ({
          ...initialState,
          // Preserve organization forecasts to avoid clearing the list when navigating back
          organizationForecasts: state.organizationForecasts,
        }));
        logger.log('[ForecastGraphStore] Store reset to initial state, preserving organization forecasts.');
      },

      setSelectedNodeId: (nodeId) => {
        logger.log(`[ForecastGraphStore] setSelectedNodeId called with nodeId: ${nodeId}`);
        set({ selectedNodeId: nodeId });
      },

      setConfigPanelOpen: (open) => {
        logger.log(`[ForecastGraphStore] setConfigPanelOpen called with: ${open}`);
        set({ configPanelOpen: open });
      },

      openConfigPanelForNode: (nodeId) => {
        logger.log(`[ForecastGraphStore] openConfigPanelForNode called for nodeId: ${nodeId}`);
        set({ selectedNodeId: nodeId, configPanelOpen: true });
      },

      setLoading: (isLoading) => {
        logger.log(`[ForecastGraphStore] setLoading called with: ${isLoading}`);
        set({ isLoading });
      },

      setError: (error) => {
        if (error === null) {
          logger.log(`[ForecastGraphStore] Clearing error state.`);
        } else {
          logger.error(`[ForecastGraphStore] setError called with: ${error}`);
        }
        set({ error });
      },

      duplicateNodeWithEdges: (nodeId) => {
        logger.log(`[ForecastGraphStore] duplicateNodeWithEdges called for nodeId: ${nodeId}`);
        const state = get();
        const nodeToDuplicate = state.nodes.find(node => node.id === nodeId);
        
        if (!nodeToDuplicate) {
          logger.warn(`[ForecastGraphStore] Node to duplicate not found: ${nodeId}`);
          return null;
        }
        
        const newNodeId = uuidv4();
        const duplicatedNode: ForecastNodeClient = {
          ...nodeToDuplicate,
          id: newNodeId,
          position: {
            x: nodeToDuplicate.position.x + 50,
            y: nodeToDuplicate.position.y + 50,
          },
          data: JSON.parse(JSON.stringify(nodeToDuplicate.data)),
        };
        
        const connectedEdges = state.edges.filter(
          edge => edge.source === nodeId || edge.target === nodeId
        );
        
        const duplicatedEdges: ForecastEdgeClient[] = connectedEdges.map(edge => {
          const newEdgeId = uuidv4();
          if (edge.source === nodeId) {
            return {
              ...edge,
              id: newEdgeId,
              source: newNodeId,
            };
          }
          return {
            ...edge,
            id: newEdgeId,
            target: newNodeId,
          };
        });
        
        set((currentState) => {
          const newNodes = [...currentState.nodes, duplicatedNode];
          const newEdges = [...currentState.edges, ...duplicatedEdges];
          const updatedNodes = updateOperatorInputOrders(newNodes, newEdges);
          
          return {
            nodes: updatedNodes,
            edges: newEdges,
            isDirty: true,
            lastEditedNodePosition: duplicatedNode.position,
          };
        });
        logger.log(`[ForecastGraphStore] Node duplicated: ${nodeId} -> ${newNodeId} with ${duplicatedEdges.length} edges.`);
        return newNodeId;
      },

      loadOrganizationForecasts: (forecasts) => {
        logger.log('[ForecastGraphStore] loadOrganizationForecasts called with:', forecasts);
        set({
          organizationForecasts: forecasts,
          isLoading: false,
          error: null,
        });
        logger.log('[ForecastGraphStore] Organization forecasts loaded.');
      },

      updateLastEditedNodePosition: (position) => {
        logger.log('[ForecastGraphStore] updateLastEditedNodePosition called with:', position);
        set({ lastEditedNodePosition: position });
      },

      // Graph validation actions
      validateGraph: async () => {
        logger.log('[ForecastGraphStore] validateGraph called');
        const state = get();
        
        try {
          set({ isValidatingGraph: true });
          
          // Use GraphConverter directly for immediate UI validation
          const graphConverter = new GraphConverter();
          const validation = graphConverter.validateGraph(state.nodes, state.edges);
          
          set({ graphValidation: validation, isValidatingGraph: false });
          return validation;
        } catch (error) {
          logger.error('[ForecastGraphStore] Graph validation failed:', error);
          const errorResult = {
            isValid: false,
            errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
            warnings: []
          };
          set({ graphValidation: errorResult, isValidatingGraph: false });
          return errorResult;
        }
      },

      setGraphValidation: (validation) => {
        logger.log('[ForecastGraphStore] setGraphValidation called with:', validation);
        set({ graphValidation: validation });
      },

      clearGraphValidation: () => {
        logger.log('[ForecastGraphStore] clearGraphValidation called');
        set({ graphValidation: null });
      },

      setValidatingGraph: (isValidating) => {
        logger.log('[ForecastGraphStore] setValidatingGraph called with:', isValidating);
        set({ isValidatingGraph: isValidating });
      },

      // Calculation actions
      calculateForecast: async () => {
        logger.log('[ForecastGraphStore] calculateForecast called');
        const state = get();
        
        // Validate required data
        if (!state.forecastId) {
          throw new Error('Forecast ID is required for calculation');
        }
        
        try {
          set({ isCalculating: true, calculationError: null });
          
          logger.log(`[ForecastGraphStore] Triggering calculation for forecast ${state.forecastId}`);
          
          // Use the API client to trigger calculation on backend
          const result = await forecastCalculationApi.calculateForecast(state.forecastId);
          
          set({ 
            calculationResults: result,
            lastCalculatedAt: new Date(),
            isCalculating: false,
            calculationError: null
          });
          
          logger.log('[ForecastGraphStore] Forecast calculation completed successfully');
        } catch (error) {
          logger.error('[ForecastGraphStore] Forecast calculation failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
          set({ 
            calculationError: errorMessage,
            isCalculating: false
          });
          throw error;
        }
      },

      loadCalculationResults: async () => {
        logger.log('[ForecastGraphStore] loadCalculationResults called');
        const state = get();
        
        if (!state.forecastId) {
          logger.warn('[ForecastGraphStore] Cannot load calculation results without forecast ID');
          return;
        }
        
        try {
          logger.log(`[ForecastGraphStore] Loading calculation results for forecast ${state.forecastId}`);
          
          const result = await forecastCalculationApi.getCalculationResults(state.forecastId);
          
          if (result) {
            set({ 
              calculationResults: result,
              lastCalculatedAt: result.calculatedAt,
              calculationError: null
            });
            logger.log('[ForecastGraphStore] Calculation results loaded successfully');
          } else {
            logger.log('[ForecastGraphStore] No calculation results found');
            set({ 
              calculationResults: null,
              lastCalculatedAt: null,
              calculationError: null
            });
          }
        } catch (error) {
          logger.error('[ForecastGraphStore] Failed to load calculation results:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to load calculation results';
          set({ calculationError: errorMessage });
        }
      },

      setCalculationResults: (results) => {
        logger.log('[ForecastGraphStore] setCalculationResults called with:', results);
        set({
          calculationResults: results,
          lastCalculatedAt: new Date(),
          calculationError: null,
        });
      },

      clearCalculationResults: () => {
        logger.log('[ForecastGraphStore] clearCalculationResults called');
        set({
          calculationResults: null,
          lastCalculatedAt: null,
          calculationError: null,
        });
      },

      setCalculating: (isCalculating) => {
        logger.log('[ForecastGraphStore] setCalculating called with:', isCalculating);
        set({ isCalculating });
      },

      setCalculationError: (error) => {
        logger.log('[ForecastGraphStore] setCalculationError called with:', error);
        set({ calculationError: error });
      },
    }),
    {
      name: 'forecast-graph-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('[ForecastGraphStore] Failed to rehydrate', error);
        } else {
          logger.log('[ForecastGraphStore] Rehydration successful', state);
        }
      },
    }
  )
);

// Selectors for easy state access
export const useForecastId = () => useForecastGraphStore((state) => state.forecastId);
export const useForecastNodes = () => useForecastGraphStore((state) => state.nodes);
export const useForecastEdges = () => useForecastGraphStore(useShallow((state) => state.edges));
export const useForecastOrganizationId = () => useForecastGraphStore((state) => state.organizationId);
export const useForecastMetadata = () => useForecastGraphStore(
  useShallow((state) => ({
    name: state.forecastName,
    startDate: state.forecastStartDate,
    endDate: state.forecastEndDate,
  }))
);
export const useIsForecastDirty = () => useForecastGraphStore((state) => state.isDirty);
export const useSelectedNodeId = () => useForecastGraphStore((state) => state.selectedNodeId);
export const useSelectedNode = () => {
  const nodeId = useForecastGraphStore((state) => state.selectedNodeId);
  const nodes = useForecastGraphStore((state) => state.nodes);
  return nodes.find((node) => node.id === nodeId);
};
export const useIsForecastLoading = () => useForecastGraphStore((state) => state.isLoading);
export const useForecastError = () => useForecastGraphStore((state) => state.error);
export const useOrganizationForecasts = () => useForecastGraphStore(useShallow((state) => state.organizationForecasts));

// NEW: Validation and calculation selectors
export const useGraphValidation = () => useForecastGraphStore((state) => state.graphValidation);
export const useIsValidatingGraph = () => useForecastGraphStore((state) => state.isValidatingGraph);
export const useCalculationResults = () => useForecastGraphStore((state) => state.calculationResults);
export const useIsCalculating = () => useForecastGraphStore((state) => state.isCalculating);
export const useCalculationError = () => useForecastGraphStore((state) => state.calculationError);
export const useLastCalculatedAt = () => useForecastGraphStore((state) => state.lastCalculatedAt);

// Action hooks for easy access
export const useLoadForecast = () => useForecastGraphStore((state) => state.loadForecast);
export const useSetForecastMetadata = () => useForecastGraphStore((state) => state.setForecastMetadata);
export const useAddNode = () => useForecastGraphStore((state) => state.addNode);
export const useUpdateNodeData = () => useForecastGraphStore((state) => state.updateNodeData);
export const useDeleteNode = () => useForecastGraphStore((state) => state.deleteNode);
export const useAddEdge = () => useForecastGraphStore((state) => state.addEdge);
export const useDeleteEdge = () => useForecastGraphStore((state) => state.deleteEdge);
export const useOnNodesChange = () => useForecastGraphStore((state) => state.onNodesChange);
export const useOnEdgesChange = () => useForecastGraphStore((state) => state.onEdgesChange);
export const useSetSelectedNodeId = () => useForecastGraphStore((state) => state.setSelectedNodeId);
export const useConfigPanelOpen = () => useForecastGraphStore((state) => state.configPanelOpen);
export const useSetConfigPanelOpen = () => useForecastGraphStore((state) => state.setConfigPanelOpen);
export const useOpenConfigPanelForNode = () => useForecastGraphStore((state) => state.openConfigPanelForNode);
export const useDuplicateNodeWithEdges = () => useForecastGraphStore((state) => state.duplicateNodeWithEdges);
export const useLoadOrganizationForecasts = () => useForecastGraphStore((state) => state.loadOrganizationForecasts);

// NEW: Last edited node position tracking hooks
export const useLastEditedNodePosition = () => useForecastGraphStore((state) => state.lastEditedNodePosition);
export const useUpdateLastEditedNodePosition = () => useForecastGraphStore((state) => state.updateLastEditedNodePosition);

// NEW: Validation and calculation action hooks
export const useValidateGraph = () => useForecastGraphStore((state) => state.validateGraph);
export const useSetGraphValidation = () => useForecastGraphStore((state) => state.setGraphValidation);
export const useClearGraphValidation = () => useForecastGraphStore((state) => state.clearGraphValidation);
export const useSetValidatingGraph = () => useForecastGraphStore((state) => state.setValidatingGraph);
export const useCalculateForecast = () => useForecastGraphStore((state) => state.calculateForecast);
export const useLoadCalculationResults = () => useForecastGraphStore((state) => state.loadCalculationResults);
export const useSetCalculationResults = () => useForecastGraphStore((state) => state.setCalculationResults);
export const useClearCalculationResults = () => useForecastGraphStore((state) => state.clearCalculationResults);
export const useSetCalculating = () => useForecastGraphStore((state) => state.setCalculating);
export const useSetCalculationError = () => useForecastGraphStore((state) => state.setCalculationError);

/**
 * Calculate a smart position for a new node based on the last edited node position.
 * If no last edited position is available, returns a default position.
 * 
 * @param lastEditedPosition - The position of the last edited node
 * @param existingNodes - Array of existing nodes to avoid overlaps
 * @returns A position object with x and y coordinates
 */
export const calculateSmartNodePosition = (
  lastEditedPosition: { x: number; y: number } | null,
  existingNodes: ForecastNodeClient[] = []
): { x: number; y: number } => {
  // If no last edited position, use default with some randomness
  if (!lastEditedPosition) {
    return {
      x: Math.random() * 300 + 50,
      y: Math.random() * 300 + 50,
    };
  }

  // Base offset from the last edited node
  const baseOffsetX = 150;
  const baseOffsetY = 100;
  
  // Try different positions around the last edited node
  const candidatePositions = [
    { x: lastEditedPosition.x + baseOffsetX, y: lastEditedPosition.y }, // Right
    { x: lastEditedPosition.x, y: lastEditedPosition.y + baseOffsetY }, // Below
    { x: lastEditedPosition.x - baseOffsetX, y: lastEditedPosition.y }, // Left
    { x: lastEditedPosition.x, y: lastEditedPosition.y - baseOffsetY }, // Above
    { x: lastEditedPosition.x + baseOffsetX, y: lastEditedPosition.y + baseOffsetY }, // Bottom-right
    { x: lastEditedPosition.x - baseOffsetX, y: lastEditedPosition.y + baseOffsetY }, // Bottom-left
    { x: lastEditedPosition.x + baseOffsetX, y: lastEditedPosition.y - baseOffsetY }, // Top-right
    { x: lastEditedPosition.x - baseOffsetX, y: lastEditedPosition.y - baseOffsetY }, // Top-left
  ];

  // Check each candidate position for overlap with existing nodes
  for (const candidate of candidatePositions) {
    const hasOverlap = existingNodes.some(node => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - candidate.x, 2) + 
        Math.pow(node.position.y - candidate.y, 2)
      );
      return distance < 120; // Minimum distance to avoid overlap
    });

    if (!hasOverlap) {
      return candidate;
    }
  }

  // If all positions have overlaps, use the first candidate with a random offset
  return {
    x: candidatePositions[0].x + (Math.random() - 0.5) * 100,
    y: candidatePositions[0].y + (Math.random() - 0.5) * 100,
  };
};