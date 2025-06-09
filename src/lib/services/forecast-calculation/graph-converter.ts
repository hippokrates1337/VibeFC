import type { 
  ForecastNodeClient, 
  ForecastEdgeClient, 
  DataNodeAttributes,
  ConstantNodeAttributes,
  OperatorNodeAttributes,
  MetricNodeAttributes,
  SeedNodeAttributes
} from '@/lib/store/forecast-graph-store';
import type { 
  CalculationTree, 
  CalculationTreeNode, 
  GraphValidationResult 
} from '@/types/forecast';

/**
 * Service for converting forecast graphs into calculation trees
 */
interface GraphConverterService {
  /**
   * Converts forecast graph into calculation trees - ONLY for top-level metric nodes
   * @param nodes Array of forecast nodes
   * @param edges Array of forecast edges
   * @returns Array of calculation trees (one per top-level metric node)
   * @throws {Error} When graph contains cycles or invalid connections
   */
  convertToTrees(
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): CalculationTree[];

  /**
   * Validates graph against forecast calculation rules
   * @param nodes Array of forecast nodes
   * @param edges Array of forecast edges
   * @returns Detailed validation result with errors and warnings
   */
  validateGraph(
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): GraphValidationResult;
}

/**
 * Implementation of graph-to-tree conversion service
 */
export class GraphConverter implements GraphConverterService {
  private readonly logger = console; // Use console for debugging output

  /**
   * Converts forecast graph into calculation trees - ONLY for top-level metric nodes
   */
  convertToTrees(
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): CalculationTree[] {
    try {
      this.logger.log('[GraphConverter] Starting graph-to-tree conversion');
      this.logger.log(`[GraphConverter] Input: ${nodes.length} nodes, ${edges.length} edges`);
      
      const validation = this.validateGraph(nodes, edges);
      if (!validation.isValid) {
        this.logger.error('[GraphConverter] Validation failed:', validation.errors);
        throw new Error(`Invalid graph: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        this.logger.warn('[GraphConverter] Validation warnings:', validation.warnings);
      }

      // UPDATED: Find only top-level metric nodes (not inputs to other metric nodes)
      const topLevelMetricNodes = this.findTopLevelMetricNodes(nodes, edges);
      this.logger.log(`[GraphConverter] Found ${topLevelMetricNodes.length} top-level metric nodes for tree roots`);
      
      const trees = topLevelMetricNodes.map(metricNode => {
        this.logger.log(`[GraphConverter] Building tree for top-level metric node: ${metricNode.id}`);
        return {
          rootMetricNodeId: metricNode.id,
          tree: this.buildTreeFromMetric(metricNode.id, nodes, edges)
        };
      });
      
      this.logger.log(`[GraphConverter] Successfully created ${trees.length} calculation trees`);
      return trees;
    } catch (error) {
      this.logger.error('[GraphConverter] Conversion failed:', error);
      throw new Error(`Failed to convert graph to trees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates graph against forecast calculation rules
   */
  validateGraph(
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): GraphValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.log('[GraphConverter] Starting graph validation');

    // Rule 1: Must have at least one metric node
    const metricNodes = this.findMetricNodes(nodes);
    if (metricNodes.length === 0) {
      errors.push('Graph must contain at least one METRIC node');
    }

    // Rule 2: Check for cycles
    if (this.detectCycles(nodes, edges)) {
      errors.push('Graph contains cycles - forecast graphs must be acyclic');
    }

    // Rule 3: Only operator nodes should accept multiple inputs
    const inputCounts = this.calculateNodeInputCounts(nodes, edges);
    Array.from(inputCounts.entries()).forEach(([nodeId, inputCount]) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.type !== 'OPERATOR' && inputCount > 1) {
        errors.push(`Node ${nodeId} (${node.type}) has ${inputCount} inputs but only OPERATOR nodes can accept multiple inputs`);
      }
    });

    // Additional validation rules
    this.validateNodeConnections(nodes, edges, errors, warnings);
    this.validateSeedNodeConnections(nodes, edges, errors, warnings);
    this.validateMetricNodeConfiguration(nodes, edges, errors, warnings);

    // NEW: Validate that we have at least one top-level metric node
    const topLevelMetricNodes = this.findTopLevelMetricNodes(nodes, edges);
    if (topLevelMetricNodes.length === 0 && metricNodes.length > 0) {
      errors.push('All METRIC nodes are connected as inputs to other METRIC nodes - at least one METRIC node must be at the top level');
    }

    const isValid = errors.length === 0;
    this.logger.log(`[GraphConverter] Validation complete - ${isValid ? 'VALID' : 'INVALID'}`);
    if (errors.length > 0) {
      this.logger.log('[GraphConverter] Validation errors:', errors);
    }
    if (warnings.length > 0) {
      this.logger.log('[GraphConverter] Validation warnings:', warnings);
    }

    return { isValid, errors, warnings };
  }

  private calculateNodeInputCounts(
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[]
  ): Map<string, number> {
    const inputCounts = new Map<string, number>();
    
    // Initialize all nodes with 0 inputs
    nodes.forEach(node => inputCounts.set(node.id, 0));
    
    // Count inputs from edges
    edges.forEach(edge => {
      const currentCount = inputCounts.get(edge.target) || 0;
      inputCounts.set(edge.target, currentCount + 1);
    });
    
    return inputCounts;
  }

  private validateNodeConnections(
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[],
    errors: string[],
    warnings: string[]
  ): void {
    // Check that all edge endpoints exist
    edges.forEach(edge => {
      const sourceExists = nodes.some(n => n.id === edge.source);
      const targetExists = nodes.some(n => n.id === edge.target);
      
      if (!sourceExists) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      if (!targetExists) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    });

    // Check for orphaned nodes (except metric nodes which can be roots)
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && node.type !== 'METRIC') {
        warnings.push(`Node ${node.id} (${node.type}) is not connected to any other nodes`);
      }
    });
  }

  private validateSeedNodeConnections(
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[],
    errors: string[],
    warnings: string[]
  ): void {
    const seedNodes = nodes.filter(n => n.type === 'SEED');
    
    seedNodes.forEach(seedNode => {
      const seedData = seedNode.data as SeedNodeAttributes;
      if (!seedData.sourceMetricId) {
        errors.push(`SEED node ${seedNode.id} missing required sourceMetricId`);
        return;
      }

      // Verify the referenced metric node exists
      const referencedMetric = nodes.find(n => n.id === seedData.sourceMetricId);
      if (!referencedMetric) {
        errors.push(`SEED node ${seedNode.id} references non-existent metric: ${seedData.sourceMetricId}. Please update the SEED node configuration or save the forecast to sync the latest changes.`);
      } else if (referencedMetric.type !== 'METRIC') {
        errors.push(`SEED node ${seedNode.id} sourceMetricId must reference a METRIC node, found: ${referencedMetric.type}`);
      }
    });
  }

  private validateMetricNodeConfiguration(
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[],
    errors: string[],
    warnings: string[]
  ): void {
    const metricNodes = nodes.filter(n => n.type === 'METRIC');
    
    metricNodes.forEach(metricNode => {
      const metricData = metricNode.data as MetricNodeAttributes;
      
      // Check if metric has calculation inputs (connected nodes)
      const hasCalculationInputs = edges.some(edge => edge.target === metricNode.id);
      
      // For metrics that rely on variables (useCalculated=false), validate variable configuration
      if (!metricData.useCalculated) {
        if (!metricData.budgetVariableId) {
          warnings.push(`METRIC node ${metricNode.id} has no budget variable configured - budget values will be null`);
        }
        if (!metricData.historicalVariableId) {
          warnings.push(`METRIC node ${metricNode.id} has no historical variable configured - historical values will be null`);
        }
      } else {
        // For calculated metrics, variables are optional but warn if missing
        if (!metricData.budgetVariableId) {
          warnings.push(`METRIC node ${metricNode.id} uses calculated values but has no budget variable fallback`);
        }
        if (!metricData.historicalVariableId) {
          warnings.push(`METRIC node ${metricNode.id} uses calculated values but has no historical variable fallback`);
        }
      }
      
      if (!metricData.label) {
        warnings.push(`METRIC node ${metricNode.id} missing label`);
      }
    });
  }

  private buildTreeFromMetric(
    metricNodeId: string, 
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): CalculationTreeNode {
    this.logger.log(`[GraphConverter] Building tree from metric node: ${metricNodeId}`);
    
    const node = nodes.find(n => n.id === metricNodeId);
    if (!node) {
      throw new Error(`Metric node ${metricNodeId} not found`);
    }

    const children = this.getNodeChildren(metricNodeId, nodes, edges);
    this.logger.log(`[GraphConverter] Node ${metricNodeId} has ${children.length} children`);

    return {
      nodeId: metricNodeId,
      nodeType: node.type as import('@/lib/store/forecast-graph-store').ForecastNodeKind,
      nodeData: node.data,
      children: children.map(child => this.buildTreeFromMetric(child.id, nodes, edges)),
      inputOrder: node.type === 'OPERATOR' ? (node.data as OperatorNodeAttributes)?.inputOrder : undefined
    };
  }

  private getNodeChildren(
    nodeId: string,
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[]
  ): ForecastNodeClient[] {
    const childIds = edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
    
    return childIds
      .map(childId => nodes.find(n => n.id === childId))
      .filter((node): node is ForecastNodeClient => node !== undefined);
  }

  private detectCycles(
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Back edge found - cycle detected
      }
      if (visited.has(nodeId)) {
        return false; // Already processed
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      // Get all outgoing edges (children)
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycleDFS(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check for cycles starting from each unvisited node
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycleDFS(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  private findMetricNodes(nodes: readonly ForecastNodeClient[]): ForecastNodeClient[] {
    return nodes.filter(node => node.type === 'METRIC');
  }

  /**
   * NEW: Find top-level metric nodes - those that are NOT inputs to other metric nodes
   */
  private findTopLevelMetricNodes(
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[]
  ): ForecastNodeClient[] {
    const metricNodes = this.findMetricNodes(nodes);
    
    // Find metric nodes that are targets of edges (inputs to other nodes)
    const metricNodesAsInputs = new Set<string>();
    edges.forEach(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode && targetNode.type === 'METRIC') {
        // This metric node is an input to another metric node
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode && sourceNode.type === 'METRIC') {
          metricNodesAsInputs.add(edge.source);
        }
      }
    });

    // Return metric nodes that are NOT inputs to other metric nodes
    const topLevelMetrics = metricNodes.filter(metric => !metricNodesAsInputs.has(metric.id));
    
    this.logger.log(`[GraphConverter] Metric nodes analysis:`);
    this.logger.log(`[GraphConverter] - Total metric nodes: ${metricNodes.length}`);
    this.logger.log(`[GraphConverter] - Metric nodes used as inputs: ${metricNodesAsInputs.size}`);
    this.logger.log(`[GraphConverter] - Top-level metric nodes: ${topLevelMetrics.length}`);
    
    return topLevelMetrics;
  }
} 