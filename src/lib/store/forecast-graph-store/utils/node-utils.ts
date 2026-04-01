import type { 
  ForecastNodeKind, 
  ForecastNodeData, 
  ForecastNodeClient, 
  ForecastEdgeClient,
  OperatorNodeAttributes,
  SeedNodeAttributes
} from '../types';

/**
 * Get default node data based on node type
 */
export const getDefaultNodeData = (type: ForecastNodeKind): ForecastNodeData => {
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
export const updateOperatorInputOrders = (nodes: ForecastNodeClient[], edges: ForecastEdgeClient[]): ForecastNodeClient[] => {
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
export const cleanOrphanedReferences = (
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
