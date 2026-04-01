import type { ForecastNodeClient, ForecastEdgeClient } from '@/lib/store/forecast-graph-store';

/**
 * Represents a node in a hierarchical tree structure
 */
export interface HierarchicalNode {
  /** Unique identifier of the node */
  id: string;
  /** Original forecast node data */
  node: ForecastNodeClient;
  /** Depth level in the hierarchy (0 = root) */
  level: number;
  /** Child nodes in the hierarchy */
  children: HierarchicalNode[];
  /** Whether this node has any children */
  hasChildren: boolean;
  /** Whether this node is currently expanded (for UI display) */
  isExpanded: boolean;
}

/**
 * Represents a flattened node with additional metadata for display
 */
export interface FlattenedNode {
  /** Unique identifier of the node */
  id: string;
  /** Original forecast node data */
  node: ForecastNodeClient;
  /** Depth level in the hierarchy (0 = root) */
  level: number;
  /** Whether this node has any children */
  hasChildren: boolean;
  /** Whether this node is currently expanded */
  isExpanded: boolean;
  /** Parent node ID, if any */
  parentId?: string;
  /** Path from root to this node */
  path: string[];
}

/**
 * Configuration options for hierarchical sorting
 */
export interface HierarchySortConfig {
  /** Set of expanded node IDs for UI state */
  expandedNodes?: Set<string>;
  /** Function to determine sort order of nodes at the same level */
  sortComparator?: (a: ForecastNodeClient, b: ForecastNodeClient) => number;
  /** Maximum depth to traverse (prevents infinite recursion) */
  maxDepth?: number;
  /** Whether to include all node types or filter to specific types */
  includeNodeTypes?: string[];
  /**
   * Controls how edges are interpreted when deriving parent / child relationships.
   * - "sourceIsParent" (default): edge.source is treated as the parent and edge.target as the child – this
   *   matches the original behaviour of the utility.
   * - "targetIsParent": edge.target is treated as the parent and edge.source as the child – useful when
   *   the graph defines dependencies in the opposite direction (e.g. inputs point to the calculated node).
   */
  edgeDirection?: 'sourceIsParent' | 'targetIsParent';
}

/**
 * Builds a hierarchical tree structure from forecast nodes and edges.
 * Analyzes the directed graph structure to determine parent-child relationships.
 * 
 * @param nodes - Array of forecast nodes
 * @param edges - Array of forecast edges defining relationships  
 * @param config - Optional configuration for sorting and filtering
 * @returns Array of root-level hierarchical nodes with nested children
 */
export function buildHierarchicalStructure(
  nodes: ForecastNodeClient[],
  edges: ForecastEdgeClient[],
  config: HierarchySortConfig = {}
): HierarchicalNode[] {
  if (!nodes.length) return [];

  const {
    expandedNodes = new Set<string>(),
    sortComparator,
    maxDepth = 50,
    includeNodeTypes,
    edgeDirection = 'sourceIsParent'
  } = config;

  // Filter nodes by type if specified
  const filteredNodes = includeNodeTypes 
    ? nodes.filter(node => node.type && includeNodeTypes.includes(node.type))
    : nodes;

  // Create maps for efficient lookups
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  const nodeMap = new Map<string, ForecastNodeClient>();

  // Build node lookup map
  filteredNodes.forEach(node => {
    nodeMap.set(node.id, node);
  });

  // Build parent-child relationship maps from edges
  edges.forEach(edge => {
    // Determine parent and child based on configured direction
    const parentId = edgeDirection === 'targetIsParent' ? edge.target : edge.source;
    const childId = edgeDirection === 'targetIsParent' ? edge.source : edge.target;

    // Only include edges where both nodes exist in the filtered set
    if (nodeMap.has(parentId) && nodeMap.has(childId)) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(childId);
      parentMap.set(childId, parentId);
    }
  });

  // Find root nodes (nodes with no parents in the current filtered set)
  const rootNodes = filteredNodes.filter(node => !parentMap.has(node.id));

  // Sort root nodes if comparator provided
  if (sortComparator) {
    rootNodes.sort(sortComparator);
  }

  // Recursive function to build hierarchy
  const buildHierarchy = (nodeId: string, level: number = 0, path: string[] = []): HierarchicalNode | null => {
    // Prevent infinite recursion
    if (level >= maxDepth) {
      console.warn(`[ForecastHierarchy] Maximum depth (${maxDepth}) reached for node ${nodeId}`);
      return null;
    }

    // Prevent circular references
    if (path.includes(nodeId)) {
      console.warn(`[ForecastHierarchy] Circular reference detected: ${path.join(' -> ')} -> ${nodeId}`);
      return null;
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      console.warn(`[ForecastHierarchy] Node ${nodeId} not found in filtered nodes`);
      return null;
    }

    const children = childrenMap.get(nodeId) || [];
    const newPath = [...path, nodeId];
    
    // Build child hierarchy recursively
    const hierarchicalChildren = children
      .map(childId => buildHierarchy(childId, level + 1, newPath))
      .filter((child): child is HierarchicalNode => child !== null);

    // Sort children if comparator provided
    if (sortComparator) {
      hierarchicalChildren.sort((a, b) => sortComparator(a.node, b.node));
    }

    return {
      id: nodeId,
      node,
      level,
      children: hierarchicalChildren,
      hasChildren: hierarchicalChildren.length > 0,
      isExpanded: expandedNodes.has(nodeId)
    };
  };

  // Build the complete hierarchy from root nodes
  const hierarchy = rootNodes
    .map(node => buildHierarchy(node.id))
    .filter((node): node is HierarchicalNode => node !== null);

  return hierarchy;
}

/**
 * Flattens a hierarchical tree structure into a linear array based on expansion state.
 * Only returns nodes that should be visible according to parent expansion state.
 * 
 * @param hierarchicalNodes - Array of root hierarchical nodes
 * @param config - Optional configuration for filtering and sorting
 * @returns Flattened array of nodes in display order
 */
export function flattenHierarchy(
  hierarchicalNodes: HierarchicalNode[],
  config: HierarchySortConfig = {}
): FlattenedNode[] {
  const result: FlattenedNode[] = [];

  const flatten = (node: HierarchicalNode, parentId?: string, parentPath: string[] = []) => {
    const currentPath = [...parentPath, node.id];
    
    // Add current node to results
    result.push({
      id: node.id,
      node: node.node,
      level: node.level,
      hasChildren: node.hasChildren,
      isExpanded: node.isExpanded,
      parentId,
      path: currentPath
    });

    // Only process children if current node is expanded
    if (node.isExpanded) {
      node.children.forEach(child => 
        flatten(child, node.id, currentPath)
      );
    }
  };

  hierarchicalNodes.forEach(node => flatten(node));
  return result;
}

/**
 * Gets the complete path from root to a specific node in the hierarchy.
 * Useful for breadcrumb navigation or understanding node ancestry.
 * 
 * @param nodeId - ID of the target node
 * @param hierarchicalNodes - Array of root hierarchical nodes
 * @returns Array of node IDs representing the path from root to target node
 */
export function getNodePath(nodeId: string, hierarchicalNodes: HierarchicalNode[]): string[] {
  const findPath = (nodes: HierarchicalNode[], targetId: string, currentPath: string[] = []): string[] | null => {
    for (const node of nodes) {
      const newPath = [...currentPath, node.id];
      
      if (node.id === targetId) {
        return newPath;
      }
      
      if (node.children.length > 0) {
        const foundPath = findPath(node.children, targetId, newPath);
        if (foundPath) {
          return foundPath;
        }
      }
    }
    return null;
  };

  return findPath(hierarchicalNodes, nodeId) || [];
}

/**
 * Finds all descendants of a given node in the hierarchy.
 * 
 * @param nodeId - ID of the parent node
 * @param hierarchicalNodes - Array of root hierarchical nodes
 * @returns Array of all descendant node IDs
 */
export function getNodeDescendants(nodeId: string, hierarchicalNodes: HierarchicalNode[]): string[] {
  const descendants: string[] = [];

  const findDescendants = (nodes: HierarchicalNode[]) => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        const collectDescendants = (children: HierarchicalNode[]) => {
          for (const child of children) {
            descendants.push(child.id);
            if (child.children.length > 0) {
              collectDescendants(child.children);
            }
          }
        };
        collectDescendants(node.children);
        return;
      }
      
      if (node.children.length > 0) {
        findDescendants(node.children);
      }
    }
  };

  findDescendants(hierarchicalNodes);
  return descendants;
}

/**
 * Default sort comparator that sorts nodes by type priority and then by name.
 * Metrics first, then Data, Operators, Seeds, and Constants last.
 * 
 * @param a - First node to compare
 * @param b - Second node to compare
 * @returns Comparison result for sorting
 */
export function defaultNodeComparator(a: ForecastNodeClient, b: ForecastNodeClient): number {
  // Define type priority order
  const typePriority: Record<string, number> = {
    'METRIC': 1,
    'DATA': 2,
    'OPERATOR': 3,
    'SEED': 4,
    'CONSTANT': 5
  };

  const aPriority = (a.type && typePriority[a.type]) || 999;
  const bPriority = (b.type && typePriority[b.type]) || 999;

  // Sort by type priority first
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  // Then sort by name/label
  const aName = getNodeDisplayName(a);
  const bName = getNodeDisplayName(b);
  
  return aName.localeCompare(bName);
}

/**
 * Helper function to get display name for a node based on its type and data.
 * 
 * @param node - The forecast node
 * @returns Human-readable display name
 */
export function getNodeDisplayName(node: ForecastNodeClient): string {
  switch (node.type) {
    case 'METRIC':
      return (node.data as any).label || 'Unnamed Metric';
    case 'DATA':
      return (node.data as any).name || 'Unnamed Data';
    case 'OPERATOR':
      return `Operator (${(node.data as any).op || '?'})`;
    case 'SEED':
      return 'Seed Node';
    case 'CONSTANT':
      return (node.data as any).name || 'Constant';
    default:
      return 'Unknown Node';
  }
}

/**
 * Validates the hierarchical structure for common issues like cycles and orphaned nodes.
 * 
 * @param nodes - Array of forecast nodes
 * @param edges - Array of forecast edges
 * @returns Validation result with any detected issues
 */
export function validateHierarchy(
  nodes: ForecastNodeClient[],
  edges: ForecastEdgeClient[]
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for cycles using DFS
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const childrenMap = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const detectCycle = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      issues.push(`Cycle detected involving node: ${nodeId}`);
      return true;
    }
    
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    const children = childrenMap.get(nodeId) || [];
    
    for (const childId of children) {
      if (detectCycle(childId)) {
        return true;
      }
    }
    
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  // Check all nodes for cycles
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      detectCycle(node.id);
    }
  }

  // Check for edges referencing non-existent nodes
  edges.forEach(edge => {
    if (!nodeMap.has(edge.source)) {
      issues.push(`Edge references non-existent source node: ${edge.source}`);
    }
    if (!nodeMap.has(edge.target)) {
      issues.push(`Edge references non-existent target node: ${edge.target}`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
} 