import { useShallow } from 'zustand/shallow';
import { useForecastGraphStore } from '../store';
import { useMemo } from 'react';

/**
 * Hook for accessing forecast graph state
 * Always subscribes to the store (no isClient early return) so hook order is valid on SSR and client.
 */
export const useForecastGraph = () =>
  useForecastGraphStore(
    useShallow((state) => ({
      forecastId: state.forecastId,
      forecastName: state.forecastName,
      forecastStartDate: state.forecastStartDate ?? '',
      forecastEndDate: state.forecastEndDate ?? '',
      organizationId: state.organizationId,
      organizationForecasts: state.organizationForecasts,
      nodes: state.nodes,
      edges: state.edges,
      isDirty: state.isDirty,
      lastEditedNodePosition: state.lastEditedNodePosition,
      selectedNodeId: state.selectedNodeId,
      configPanelOpen: state.configPanelOpen,
      isLoading: state.isLoading,
      error: state.error,
    }))
  );

/**
 * Hook for accessing forecast graph actions
 */
export const useForecastGraphActions = () => {
  const store = useForecastGraphStore();

  return useMemo(
    () => ({
      addNode: store.addNode,
      updateNodeData: store.updateNodeData,
      updateNodePosition: store.updateNodePosition,
      deleteNode: store.deleteNode,
      duplicateNodeWithEdges: store.duplicateNodeWithEdges,
      addEdge: store.addEdge,
      deleteEdge: store.deleteEdge,
      onNodesChange: store.onNodesChange,
      onEdgesChange: store.onEdgesChange,
      setDirty: store.setDirty,
      resetStore: store.resetStore,
      loadForecast: store.loadForecast,
      setForecastMetadata: store.setForecastMetadata,
      loadOrganizationForecasts: store.loadOrganizationForecasts,
      setSelectedNodeId: store.setSelectedNodeId,
      setConfigPanelOpen: store.setConfigPanelOpen,
      openConfigPanelForNode: store.openConfigPanelForNode,
      setLoading: store.setLoading,
      setError: store.setError,
    }),
    [store]
  );
};

/**
 * Hook for getting the currently selected node
 */
export const useSelectedNode = () => {
  const { nodes, selectedNodeId } = useForecastGraph();
  return selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
};
