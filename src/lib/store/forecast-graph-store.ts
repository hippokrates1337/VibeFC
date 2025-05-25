import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Edge, Node, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import type { Forecast as ClientForecastSummary } from '@/lib/api/forecast';
import { logger } from '@/lib/utils/logger';

// Define node types
export type ForecastNodeKind = 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

// Define node attribute interfaces
export interface DataNodeAttributes {
  name: string;
  variableId: string;
  offsetMonths: number;
}

export interface ConstantNodeAttributes {
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
  isLoading: boolean;
  error: string | null;
  organizationForecasts: ClientForecastSummary[];
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
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  duplicateNodeWithEdges: (nodeId: string) => string | null;
  loadOrganizationForecasts: (forecasts: ClientForecastSummary[]) => void;
}

// Helper functions
const getDefaultNodeData = (type: ForecastNodeKind): ForecastNodeData => {
  switch (type) {
    case 'DATA':
      return { name: 'New Data Node', variableId: '', offsetMonths: 0 };
    case 'CONSTANT':
      return { value: 0 };
    case 'OPERATOR':
      return { op: '+', inputOrder: [] };
    case 'METRIC':
      return { label: '', budgetVariableId: '', historicalVariableId: '' };
    case 'SEED':
      return { sourceMetricId: '' };
    default:
      return { value: 0 };
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
  isLoading: false,
  error: null,
  organizationForecasts: [],
};

// Create store with persist middleware
export const useForecastGraphStore = create<ForecastGraphState & ForecastGraphActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      loadForecast: (data) => {
        logger.log('[ForecastGraphStore] loadForecast called with:', data);
        set({
          forecastId: data.id,
          forecastName: data.name,
          forecastStartDate: data.startDate,
          forecastEndDate: data.endDate,
          organizationId: data.organizationId,
          nodes: data.nodes,
          edges: data.edges,
          isDirty: false,
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
          };
        });

        return id;
      },

      updateNodeData: (nodeId, dataUpdates) => {
        logger.log(`[ForecastGraphStore] updateNodeData called for nodeId: ${nodeId} with updates:`, dataUpdates);
        set((state) => ({
          nodes: state.nodes.map((node) => 
            node.id === nodeId 
              ? { ...node, data: { ...node.data, ...dataUpdates } } 
              : node
          ),
          isDirty: true,
        }));
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
          const dirty = changes.some(change => 
            change.type === 'position' || 
            change.type === 'dimensions' || 
            change.type === 'remove' ||
            change.type === 'select'
          );
          if (dirty) {
            // logger.log('[ForecastGraphStore] Nodes changed, setting isDirty to true.');
          }
          return {
            nodes: newNodes,
            isDirty: dirty ? true : state.isDirty,
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
export const useDuplicateNodeWithEdges = () => useForecastGraphStore((state) => state.duplicateNodeWithEdges);
export const useLoadOrganizationForecasts = () => useForecastGraphStore((state) => state.loadOrganizationForecasts);