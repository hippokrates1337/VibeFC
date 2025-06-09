import { ForecastNodeClient, ForecastEdgeClient } from '@/lib/store/forecast-graph-store';

// Use NEXT_PUBLIC_BACKEND_URL to point to the separate backend service
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Define response and data types
export interface Forecast {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  forecastStartDate: string | null;
  forecastEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// New interface for forecast with graph summary statistics
export interface ForecastWithSummary extends Forecast {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: string[];
}

export interface ForecastNode {
  id: string;
  forecastId: string;
  kind: string;
  attributes: Record<string, any>;
  position: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}

export interface ForecastEdge {
  id: string;
  forecastId: string;
  sourceNodeId: string;
  targetNodeId: string;
  createdAt: string;
}

// Expected structure for the combined client-side representation
export interface FlattenedForecastWithDetails extends Forecast {
  nodes: ForecastNode[]; // These are API ForecastNode, not Client nodes yet
  edges: ForecastEdge[]; // These are API ForecastEdge, not Client edges yet
}

// This interface is for the direct response of GET /forecasts/:id
// It matches the backend's ForecastDto
export interface ForecastMetadata {
  id: string;
  name: string;
  forecastStartDate: string;
  forecastEndDate: string;
  organizationId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastWithDetails {
  forecast: Forecast;
  nodes: ForecastNode[];
  edges: ForecastEdge[];
}

interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    statusCode?: number;
  };
}

// Helper function to get auth token from cookie
function getAuthToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-access-token') {
      return value;
    }
  }
  return undefined;
}

// Helper function for API requests with auth token
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 204 No Content before attempting to parse JSON
    if (response.status === 204) {
      // For 204, there is no body, so return success with undefined data or an empty object
      // The calling function should be aware of this possibility for PATCH/DELETE.
      return { data: undefined }; // Or { data: {} as T } if a non-undefined object is always expected
    }

    const responseText = await response.text(); // Read as text first to avoid issues with empty/malformed JSON
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (e: any) {
      // If JSON parsing fails, and response was not ok, this will be part of the error.
      // If response was ok but JSON is bad, this is a server issue.
      if (response.ok) {
        return {
          error: {
            message: `Failed to parse JSON response: ${e.message}`,
            statusCode: response.status,
          },
        };
      }
      // If not ok and JSON parse failed, use a generic message for data.message below.
      // The primary error is the !response.ok status.
    }

    if (!response.ok) {
      return {
        error: {
          // Use parsed error message if available, otherwise a generic one
          message: (data && data.message) || responseText || 'An error occurred',
          statusCode: response.status,
        },
      };
    }

    return { data };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Network error',
      },
    };
  }
}

// Helper to convert combined API data to client format
export function mapForecastToClientFormat(combinedData: FlattenedForecastWithDetails | any): {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  organizationId: string;
  nodes: ForecastNodeClient[];
  edges: ForecastEdgeClient[];
} {
  // Add a check to ensure combinedData and its core forecast properties are valid
  if (!combinedData || !combinedData.id || typeof combinedData.name === 'undefined') {
    console.error('Invalid or incomplete combined forecast data for client mapping:', combinedData);
    throw new Error('Incomplete forecast data: Core forecast details (id, name) are missing or invalid for client mapping.');
  }
  
  // Ensure we have the required date fields
  if (!combinedData.forecastStartDate || !combinedData.forecastEndDate) {
    console.error('Missing date information in forecast data:', combinedData);
    throw new Error('Incomplete forecast data: Date information is missing for client mapping.');
  }

  return {
    id: combinedData.id,
    name: combinedData.name,
    startDate: combinedData.forecastStartDate,
    endDate: combinedData.forecastEndDate,
    organizationId: combinedData.organizationId,
    nodes: (combinedData.nodes || []).map((node: any) => ({
      id: node.id,
      type: node.kind,
      position: node.position,
      data: node.attributes,
    })) as ForecastNodeClient[],
    edges: (combinedData.edges || []).map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
    })) as ForecastEdgeClient[],
  };
}

// Helper to convert client forecast to API format - This function is no longer used after refactoring saveForecastGraph
/*
export function mapClientToApiFormat(
  forecastId: string,
  name: string,
  startDate: string,
  endDate: string,
  nodes: ForecastNodeClient[],
  edges: ForecastEdgeClient[]
) {
  return {
    forecast: {
      name,
      forecastStartDate: startDate,
      forecastEndDate: endDate,
    },
    nodes: nodes.map((node: any) => ({
      kind: node.type,
      attributes: node.data,
      position: node.position,
    })),
    edges: edges.map((edge: any) => ({
      source_node_id: edge.source,
      target_node_id: edge.target,
    })),
  };
}
*/

// Forecast API endpoints
export const forecastApi = {
  // Get all forecasts
  getForecasts: async (organizationId: string): Promise<ApiResponse<Forecast[]>> => {
    if (!organizationId) {
      console.error('getForecasts called without organizationId');
      return { error: { message: 'Organization ID is required to fetch forecasts.' } };
    }
    return fetchWithAuth<Forecast[]>(`/forecasts?organizationId=${organizationId}`, {
      method: 'GET',
    });
  },

  // Get all forecasts for an organization with graph summary data
  getForecastsWithSummary: async (organizationId: string): Promise<ApiResponse<ForecastWithSummary[]>> => {
    return fetchWithAuth<ForecastWithSummary[]>(`/organizations/${organizationId}/forecasts/summary`, {
      method: 'GET',
    });
  },

  // Get a specific forecast with nodes and edges by making multiple calls
  getForecast: async (forecastId: string): Promise<ApiResponse<FlattenedForecastWithDetails>> => {
    try {
      // 1. Fetch forecast metadata
      const metadataResponse = await fetchWithAuth<ForecastMetadata>(`/forecasts/${forecastId}`, {
        method: 'GET',
      });

      if (metadataResponse.error || !metadataResponse.data) {
        return { error: metadataResponse.error || { message: 'Failed to fetch forecast metadata.' } };
      }
      const forecastMetadata = metadataResponse.data;

      // 2. Fetch forecast nodes
      const nodesResponse = await fetchWithAuth<ForecastNode[]>(`/forecasts/${forecastId}/nodes`, {
        method: 'GET',
      });

      if (nodesResponse.error) { // Nodes can be an empty array, so !nodesResponse.data is not an error if error object isn't present
        return { error: nodesResponse.error };
      }
      const forecastNodes = nodesResponse.data || [];

      // 3. Fetch forecast edges
      const edgesResponse = await fetchWithAuth<ForecastEdge[]>(`/forecasts/${forecastId}/edges`, {
        method: 'GET',
      });

      if (edgesResponse.error) { // Edges can be an empty array
        return { error: edgesResponse.error };
      }
      const forecastEdges = edgesResponse.data || [];

      // Combine into FlattenedForecastWithDetails structure
      const combinedData: FlattenedForecastWithDetails = {
        ...forecastMetadata, // Spread all properties from ForecastMetadata
        nodes: forecastNodes,
        edges: forecastEdges,
      };
      
      return { data: combinedData };

    } catch (error: any) {
      console.error(`Error in getForecast fetching combined data for ${forecastId}:`, error);
      return { error: { message: error.message || 'An unexpected error occurred while fetching full forecast details.' } };
    }
  },

  // Create a new forecast
  createForecast: async (
    name: string,
    startDate: string,
    endDate: string,
    organizationId: string
  ): Promise<ApiResponse<Forecast>> => {
    return fetchWithAuth<Forecast>('/forecasts', {
      method: 'POST',
      body: JSON.stringify({
        name,
        forecastStartDate: startDate,
        forecastEndDate: endDate,
        organizationId,
      }),
    });
  },

  // Update a forecast (metadata only)
  updateForecast: async (
    forecastId: string,
    updates: {
      name?: string;
      forecastStartDate?: string;
      forecastEndDate?: string;
    }
  ): Promise<ApiResponse<Forecast>> => {
    return fetchWithAuth<Forecast>(`/forecasts/${forecastId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Delete a forecast
  deleteForecast: async (forecastId: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/forecasts/${forecastId}`, {
      method: 'DELETE',
    });
  },

  // Save the entire forecast graph (nodes and edges)
  saveForecastGraph: async (
    forecastId: string,
    name: string,
    startDate: string,
    endDate: string,
    nodes: ForecastNodeClient[],
    edges: ForecastEdgeClient[]
  ): Promise<ApiResponse<FlattenedForecastWithDetails>> => {
    try {
      // 1. Update forecast metadata
      const metadataUpdatePayload = {
        name,
        forecastStartDate: startDate,
        forecastEndDate: endDate,
      };
      const metadataResponse = await forecastApi.updateForecast(forecastId, metadataUpdatePayload);
      if (metadataResponse.error) {
        console.error('Failed to update forecast metadata:', metadataResponse.error);
        return { error: { message: `Failed to update forecast metadata: ${metadataResponse.error.message}` } };
      }

      // 2. Fetch existing nodes and edges to delete them
      // It's often safer to fetch IDs and then delete, rather than a "delete all" if not available.
      // However, the current backend controller doesn't offer a "delete all nodes/edges for forecast" endpoint.
      // We'll fetch them and delete one by one. This could be slow for large graphs.
      // A backend improvement would be bulk delete/replace endpoints.

      const existingNodesResponse = await forecastApi.getForecast(forecastId); // getForecast also returns nodes/edges
      if (existingNodesResponse.error || !existingNodesResponse.data) {
        console.error('Failed to fetch existing graph elements for deletion:', existingNodesResponse.error);
        return { error: { message: `Failed to fetch existing graph data before update: ${existingNodesResponse.error?.message || 'Unknown error'}` } };
      }
      
      const initialForecastDetails = existingNodesResponse.data; // Store this for later
      const existingNodes = initialForecastDetails.nodes;
      const existingEdges = initialForecastDetails.edges;

      // 3. Delete existing edges
      for (const edge of existingEdges) {
        const deleteEdgeResponse = await forecastApi.deleteEdge(forecastId, edge.id);
        if (deleteEdgeResponse.error) {
          console.error(`Failed to delete edge ${edge.id}:`, deleteEdgeResponse.error);
          // Decide on error strategy: fail fast or try to continue? For now, fail fast.
          return { error: { message: `Failed to delete edge ${edge.id}: ${deleteEdgeResponse.error.message}` } };
        }
      }

      // 4. Delete existing nodes
      // (Must be done after edges to avoid foreign key constraint issues if any)
      for (const node of existingNodes) {
        const deleteNodeResponse = await forecastApi.deleteNode(forecastId, node.id);
        if (deleteNodeResponse.error) {
          console.error(`Failed to delete node ${node.id}:`, deleteNodeResponse.error);
          return { error: { message: `Failed to delete node ${node.id}: ${deleteNodeResponse.error.message}` } };
        }
      }

      // 5. Add new nodes
      const createdNodes: ForecastNode[] = [];
      const nodeIdMap = new Map<string, string>(); // Map from old client ID to new server ID

      for (const nodeClient of nodes) {
        // For SEED nodes, we need to update sourceMetricId references after all nodes are created
        let nodeData = nodeClient.data;
        
        const addNodeResponse = await forecastApi.addNode(
          forecastId,
          nodeClient.type as string,
          nodeData,
          nodeClient.position
        );
        if (addNodeResponse.error || !addNodeResponse.data) {
          console.error('Failed to add node:', addNodeResponse.error);
          return { error: { message: `Failed to add node: ${addNodeResponse.error?.message || 'Unknown error'}` } };
        }
        createdNodes.push(addNodeResponse.data);
        // Store the mapping from the original client ID to the new server ID
        nodeIdMap.set(nodeClient.id, addNodeResponse.data.id);
      }

      // 5.1. Update SEED node references to point to new metric IDs
      const seedNodes = createdNodes.filter(node => node.kind === 'SEED');
      for (const seedNode of seedNodes) {
        const seedData = seedNode.attributes as any;
        if (seedData.sourceMetricId) {
          const newMetricId = nodeIdMap.get(seedData.sourceMetricId);
          if (newMetricId) {
            // Update the SEED node with the correct metric reference
            const updateResponse = await forecastApi.updateNode(
              forecastId,
              seedNode.id,
              {
                attributes: {
                  ...seedData,
                  sourceMetricId: newMetricId
                }
              }
            );
            if (updateResponse.error) {
              console.error(`Failed to update SEED node ${seedNode.id} reference:`, updateResponse.error);
              return { error: { message: `Failed to update SEED node reference: ${updateResponse.error.message}` } };
            }
            // Update the local node data for the response
            seedNode.attributes = { ...seedData, sourceMetricId: newMetricId };
          }
        }
      }

      // 5.2. Update OPERATOR node inputOrder to point to new node IDs
      const operatorNodes = createdNodes.filter(node => node.kind === 'OPERATOR');
      for (const operatorNode of operatorNodes) {
        const operatorData = operatorNode.attributes as any;
        if (operatorData.inputOrder && Array.isArray(operatorData.inputOrder)) {
          // Map old node IDs to new node IDs in inputOrder
          const updatedInputOrder = operatorData.inputOrder
            .map((oldNodeId: string) => nodeIdMap.get(oldNodeId))
            .filter((newNodeId: string | undefined) => newNodeId !== undefined);
          
          if (updatedInputOrder.length > 0) {
            // Update the OPERATOR node with the correct inputOrder
            const updateResponse = await forecastApi.updateNode(
              forecastId,
              operatorNode.id,
              {
                attributes: {
                  ...operatorData,
                  inputOrder: updatedInputOrder
                }
              }
            );
            if (updateResponse.error) {
              console.error(`Failed to update OPERATOR node ${operatorNode.id} inputOrder:`, updateResponse.error);
              return { error: { message: `Failed to update OPERATOR node inputOrder: ${updateResponse.error.message}` } };
            }
            // Update the local node data for the response
            operatorNode.attributes = { ...operatorData, inputOrder: updatedInputOrder };
          }
        }
      }

      // 6. Add new edges
      const createdEdges: ForecastEdge[] = [];
      for (const edgeClient of edges) {
        const serverSourceId = nodeIdMap.get(edgeClient.source);
        const serverTargetId = nodeIdMap.get(edgeClient.target);

        if (!serverSourceId || !serverTargetId) {
          console.error('Failed to map client edge IDs to server IDs:', edgeClient);
          return { error: { message: `Failed to find server ID for client node ID in edge: ${edgeClient.id}. Source: ${edgeClient.source}, Target: ${edgeClient.target}` } };
        }

        const addEdgeResponse = await forecastApi.addEdge(
          forecastId,
          serverSourceId, // Use the new server ID
          serverTargetId  // Use the new server ID
        );
        if (addEdgeResponse.error || !addEdgeResponse.data) {
          console.error('Failed to add edge:', addEdgeResponse.error);
          return { error: { message: `Failed to add edge: ${addEdgeResponse.error?.message || 'Unknown error'}` } };
        }
        createdEdges.push(addEdgeResponse.data);
      }
      
      // Construct the response similar to what getForecast would return
      // The metadata should be fresh from the updateForecast call or re-fetched
      // For simplicity, we'll use the initial metadata and new nodes/edges
      const finalForecastData: FlattenedForecastWithDetails = {
        id: forecastId,
        name, // from input, as it was just updated
        forecastStartDate: startDate, // from input, as it was just updated
        forecastEndDate: endDate, // from input, as it was just updated
        organizationId: initialForecastDetails.organizationId, // from initial fetch
        userId: initialForecastDetails.userId, // from initial fetch
        createdAt: initialForecastDetails.createdAt, // from initial fetch
        updatedAt: new Date().toISOString(), // Should ideally come from a new fetch or updateForecast response if it returned data
        nodes: createdNodes,
        edges: createdEdges,
      };

      return { data: finalForecastData };

    } catch (error: any) {
      console.error('Error in saveForecastGraph:', error);
      return { error: { message: `Error saving forecast graph: ${error.message || 'Unknown error'}` } };
    }
  },

  // Add a node to a forecast
  addNode: async (
    forecastId: string,
    kind: string,
    attributes: Record<string, any>,
    position: { x: number; y: number }
  ): Promise<ApiResponse<ForecastNode>> => {
    return fetchWithAuth<ForecastNode>(`/forecasts/${forecastId}/nodes`, {
      method: 'POST',
      body: JSON.stringify({ forecastId, kind, attributes, position }),
    });
  },

  // Update a node
  updateNode: async (
    forecastId: string,
    nodeId: string,
    updates: {
      attributes?: Record<string, any>;
      position?: { x: number; y: number };
    }
  ): Promise<ApiResponse<ForecastNode>> => {
    return fetchWithAuth<ForecastNode>(`/forecasts/${forecastId}/nodes/${nodeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Delete a node
  deleteNode: async (
    forecastId: string,
    nodeId: string
  ): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/forecasts/${forecastId}/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  },

  // Add an edge to a forecast
  addEdge: async (
    forecastId: string,
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<ApiResponse<ForecastEdge>> => {
    return fetchWithAuth<ForecastEdge>(`/forecasts/${forecastId}/edges`, {
      method: 'POST',
      body: JSON.stringify({ 
        forecastId,
        sourceNodeId, 
        targetNodeId 
      }),
    });
  },

  // Delete an edge
  deleteEdge: async (
    forecastId: string,
    edgeId: string
  ): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/forecasts/${forecastId}/edges/${edgeId}`, {
      method: 'DELETE',
    });
  },
}; 