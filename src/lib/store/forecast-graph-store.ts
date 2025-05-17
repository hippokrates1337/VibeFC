import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Edge, Node, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// Define node types
export type ForecastNodeKind = 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

// Define node attribute interfaces
export interface DataNodeAttributes {
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
  nodes: ForecastNodeClient[];
  edges: ForecastEdgeClient[];
  isDirty: boolean;
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Store actions
interface ForecastGraphActions {
  loadForecast: (data: { 
    id: string; 
    name: string; 
    startDate: string; 
    endDate: string; 
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
}

// Helper functions
const getDefaultNodeData = (type: ForecastNodeKind): ForecastNodeData => {
  switch (type) {
    case 'DATA':
      return { variableId: '', offsetMonths: 0 };
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

// Initial state
const initialState: ForecastGraphState = {
  forecastId: null,
  forecastName: '',
  forecastStartDate: null,
  forecastEndDate: null,
  nodes: [],
  edges: [],
  isDirty: false,
  selectedNodeId: null,
  isLoading: false,
  error: null,
};

// Create store with persist middleware
export const useForecastGraphStore = create<ForecastGraphState & ForecastGraphActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      loadForecast: (data) => {
        set({
          forecastId: data.id,
          forecastName: data.name,
          forecastStartDate: data.startDate,
          forecastEndDate: data.endDate,
          nodes: data.nodes,
          edges: data.edges,
          isDirty: false,
          isLoading: false,
          error: null,
        });
      },

      setForecastMetadata: (metadata) => {
        set((state) => ({
          forecastName: metadata.name ?? state.forecastName,
          forecastStartDate: metadata.startDate ?? state.forecastStartDate,
          forecastEndDate: metadata.endDate ?? state.forecastEndDate,
          isDirty: true,
        }));
      },

      addNode: (nodeData) => {
        const id = uuidv4();
        const position = nodeData.position ?? { x: 100, y: 100 };
        const defaultData = getDefaultNodeData(nodeData.type);
        const newNode: ForecastNodeClient = {
          id,
          type: nodeData.type,
          position,
          data: { ...defaultData, ...nodeData.data },
        };

        set((state) => ({
          nodes: [...state.nodes, newNode],
          isDirty: true,
        }));

        return id;
      },

      updateNodeData: (nodeId, dataUpdates) => {
        set((state) => ({
          nodes: state.nodes.map((node) => 
            node.id === nodeId 
              ? { ...node, data: { ...node.data, ...dataUpdates } } 
              : node
          ),
          isDirty: true,
        }));
      },

      updateNodePosition: (nodeId, position) => {
        set((state) => ({
          nodes: state.nodes.map((node) => 
            node.id === nodeId 
              ? { ...node, position } 
              : node
          ),
          isDirty: true,
        }));
      },

      deleteNode: (nodeId) => {
        set((state) => {
          // Filter out the node to delete
          const filteredNodes = state.nodes.filter((node) => node.id !== nodeId);
          
          // Filter out edges connected to the deleted node
          const filteredEdges = state.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          );
          
          return {
            nodes: filteredNodes,
            edges: filteredEdges,
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
            isDirty: true,
          };
        });
      },

      addEdge: (edge) => {
        const id = uuidv4();
        const newEdge: ForecastEdgeClient = {
          ...edge,
          id,
        };

        set((state) => ({
          edges: [...state.edges, newEdge],
          isDirty: true,
        }));

        return id;
      },

      deleteEdge: (edgeId) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== edgeId),
          isDirty: true,
        }));
      },

      onNodesChange: (changes) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes) as ForecastNodeClient[],
          isDirty: changes.some(change => 
            change.type === 'position' || 
            change.type === 'dimensions' || 
            change.type === 'remove'
          ) ? true : state.isDirty,
        }));
      },

      onEdgesChange: (changes) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges) as ForecastEdgeClient[],
          isDirty: changes.some(change => 
            change.type === 'remove'
          ) ? true : state.isDirty,
        }));
      },

      setDirty: (isDirty) => {
        set({ isDirty });
      },

      resetStore: () => {
        set(initialState);
      },

      setSelectedNodeId: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'forecast-graph-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        forecastId: state.forecastId,
        forecastName: state.forecastName,
        forecastStartDate: state.forecastStartDate,
        forecastEndDate: state.forecastEndDate,
        nodes: state.nodes,
        edges: state.edges,
        // Exclude runtime state (isDirty, selectedNodeId, isLoading, error)
      }),
    }
  )
);

// Convenience selectors
export const useForecastNodes = () => useForecastGraphStore((state) => state.nodes);
export const useForecastEdges = () => useForecastGraphStore((state) => state.edges);
export const useForecastMetadata = () => useForecastGraphStore((state) => ({
  id: state.forecastId,
  name: state.forecastName,
  startDate: state.forecastStartDate,
  endDate: state.forecastEndDate,
}));
export const useIsForecastDirty = () => useForecastGraphStore((state) => state.isDirty);
export const useSelectedNodeId = () => useForecastGraphStore((state) => state.selectedNodeId);
export const useSelectedNode = () => {
  const selectedNodeId = useForecastGraphStore((state) => state.selectedNodeId);
  const nodes = useForecastGraphStore((state) => state.nodes);
  return nodes.find((node) => node.id === selectedNodeId) || null;
};
export const useIsForecastLoading = () => useForecastGraphStore((state) => state.isLoading);
export const useForecastError = () => useForecastGraphStore((state) => state.error);

// Actions hooks
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