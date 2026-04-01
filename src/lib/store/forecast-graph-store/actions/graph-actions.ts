import { v4 as uuidv4 } from 'uuid';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { logger } from '@/lib/utils/logger';
import type { 
  ForecastGraphState
} from '../state';
import type {
  AddNodeParams,
  ForecastNodeClient,
  ForecastEdgeClient
} from '../types';
import { 
  getDefaultNodeData, 
  updateOperatorInputOrders, 
  cleanOrphanedReferences 
} from '../utils';

export const createGraphActions = (set: (partial: any) => void, get: () => any) => ({
  addNode: (nodeData: AddNodeParams) => {
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

    set((state: ForecastGraphState) => {
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

  updateNodeData: (nodeId: string, dataUpdates: Partial<any>) => {
    logger.log(`[ForecastGraphStore] updateNodeData called for nodeId: ${nodeId} with updates:`, dataUpdates);
    set((state: ForecastGraphState) => {
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

  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    logger.log(`[ForecastGraphStore] updateNodePosition called for nodeId: ${nodeId} with position:`, position);
    set((state: ForecastGraphState) => ({
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

  deleteNode: (nodeId: string) => {
    logger.log(`[ForecastGraphStore] deleteNode called for nodeId: ${nodeId}`);
    set((state: ForecastGraphState) => {
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

  addEdge: (edge: Omit<ForecastEdgeClient, 'id'>) => {
    logger.log('[ForecastGraphStore] addEdge called with:', edge);
    const id = uuidv4();
    const newEdge: ForecastEdgeClient = {
      ...edge,
      id,
    };

    set((state: ForecastGraphState) => {
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

  deleteEdge: (edgeId: string) => {
    logger.log(`[ForecastGraphStore] deleteEdge called for edgeId: ${edgeId}`);
    set((state: ForecastGraphState) => {
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

  onNodesChange: (changes: NodeChange[]) => {
    set((state: ForecastGraphState) => {
      const newNodes = applyNodeChanges(changes, state.nodes) as ForecastNodeClient[];
      
      // Only mark as dirty for structural changes that affect calculation
      const dirty = changes.some(change => 
        change.type === 'remove' ||
        change.type === 'add'
      );
      
      // Track position changes for smart node placement
      let lastEditedNodePosition = state.lastEditedNodePosition;
      
      const positionChanges = changes.filter(change => 
        change.type === 'position' && 
        change.position !== undefined
      );
      
      if (positionChanges.length > 0) {
        const lastPositionChange = positionChanges[positionChanges.length - 1];
        if (lastPositionChange.type === 'position' && lastPositionChange.position) {
          lastEditedNodePosition = lastPositionChange.position;
        }
      }
      
      return {
        nodes: newNodes,
        isDirty: dirty ? true : state.isDirty,
        lastEditedNodePosition,
      };
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state: ForecastGraphState) => {
      const newEdges = applyEdgeChanges(changes, state.edges) as ForecastEdgeClient[];
      const hasEdgeChanges = changes.some(change => change.type === 'remove' || change.type === 'add');
      const updatedNodes = hasEdgeChanges ? updateOperatorInputOrders(state.nodes, newEdges) : state.nodes;
      
      const dirty = changes.some(change => change.type === 'remove');
      return {
        edges: newEdges,
        nodes: updatedNodes,
        isDirty: dirty ? true : state.isDirty,
      };
    });
  },

  setDirty: (isDirty: boolean) => {
    logger.log(`[ForecastGraphStore] setDirty called with: ${isDirty}`);
    set({ isDirty });
  },

  resetStore: () => {
    logger.log('[ForecastGraphStore] resetStore called.');
    set((state: ForecastGraphState) => ({
      // Reset to initial state but preserve organization forecasts
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
      lastEditedNodePosition: null,
      graphValidation: null,
      isValidatingGraph: false,
      calculationResults: null,
      isCalculating: false,
      calculationError: null,
      lastCalculatedAt: null,
      forecastPeriods: null,
      selectedVisualizationMonth: null,
      showVisualizationSlider: false,
      // Preserve organization forecasts
      organizationForecasts: state.organizationForecasts,
    }));
    logger.log('[ForecastGraphStore] Store reset to initial state, preserving organization forecasts.');
  },

  duplicateNodeWithEdges: (nodeId: string) => {
    logger.log(`[ForecastGraphStore] duplicateNodeWithEdges called for nodeId: ${nodeId}`);
    const state = get();
    const nodeToDuplicate = state.nodes.find((node: ForecastNodeClient) => node.id === nodeId);
    
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
      (edge: ForecastEdgeClient) => edge.source === nodeId || edge.target === nodeId
    );
    
    const duplicatedEdges: ForecastEdgeClient[] = connectedEdges.map((edge: ForecastEdgeClient) => {
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
    
    set((currentState: ForecastGraphState) => {
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
});
