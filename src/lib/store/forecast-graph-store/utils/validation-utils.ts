import type { ForecastNodeClient, ForecastEdgeClient, GraphValidationResult } from '../types';

/**
 * Validate individual node data
 */
export const validateNodeData = (node: ForecastNodeClient): string[] => {
  const errors: string[] = [];
  
  if (!node.id) {
    errors.push(`Node ${node.id} has no ID`);
  }
  
  if (!node.type) {
    errors.push(`Node ${node.id} has no type`);
  }
  
  if (!node.data) {
    errors.push(`Node ${node.id} has no data`);
  }
  
  return errors;
};

/**
 * Validate graph structure
 */
export const validateGraphStructure = (nodes: ForecastNodeClient[], edges: ForecastEdgeClient[]): GraphValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for nodes without data
  nodes.forEach(node => {
    const nodeErrors = validateNodeData(node);
    errors.push(...nodeErrors);
  });
  
  // Check for orphaned edges
  const nodeIds = new Set(nodes.map(n => n.id));
  edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source node ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target node ${edge.target}`);
    }
  });
  
  // Check for duplicate node IDs
  const nodeIdCounts = new Map<string, number>();
  nodes.forEach(node => {
    nodeIdCounts.set(node.id, (nodeIdCounts.get(node.id) || 0) + 1);
  });
  
  nodeIdCounts.forEach((count, nodeId) => {
    if (count > 1) {
      errors.push(`Duplicate node ID found: ${nodeId} (${count} occurrences)`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
