/**
 * Node Evaluator Service - Phase 2.3
 * Central service that delegates node evaluation to appropriate strategies
 */

import { Injectable, Inject } from '@nestjs/common';
import { 
  CalculationTreeNode, 
  CalculationType, 
  CalculationContext,
  NodeType
} from '../types/calculation-types';
import { NodeEvaluationStrategy } from '../strategies/node-evaluation-strategy';
import { DataNodeStrategy } from '../strategies/data-node-strategy';
import { ConstantNodeStrategy } from '../strategies/constant-node-strategy';
import { OperatorNodeStrategy } from '../strategies/operator-node-strategy';
import { MetricNodeStrategy } from '../strategies/metric-node-strategy';
import { SeedNodeStrategy } from '../strategies/seed-node-strategy';

@Injectable()
export class NodeEvaluator {
  private strategies = new Map<NodeType, NodeEvaluationStrategy>();

  constructor(
    private readonly dataNodeStrategy: DataNodeStrategy,
    private readonly constantNodeStrategy: ConstantNodeStrategy,
    private readonly operatorNodeStrategy: OperatorNodeStrategy,
    private readonly metricNodeStrategy: MetricNodeStrategy,
    private readonly seedNodeStrategy: SeedNodeStrategy,
    @Inject('Logger') private readonly logger: any
  ) {
    // Register all strategies
    this.registerStrategy(this.dataNodeStrategy);
    this.registerStrategy(this.constantNodeStrategy);
    this.registerStrategy(this.operatorNodeStrategy);
    this.registerStrategy(this.metricNodeStrategy);
    this.registerStrategy(this.seedNodeStrategy);

    this.logger.log(`[NodeEvaluator] Initialized with ${this.strategies.size} strategies`);
  }

  /**
   * Evaluate a node using the appropriate strategy
   */
  async evaluate(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext
  ): Promise<number | null> {
    // Enhance context with node evaluator reference for circular dependency resolution
    const enhancedContext = {
      ...context,
      nodeEvaluator: this
    };

    const strategy = this.strategies.get(node.nodeType as NodeType);
    if (!strategy) {
      this.logger.error(`[NodeEvaluator] No strategy found for node type: ${node.nodeType}`);
      throw new Error(`Unknown node type: ${node.nodeType}`);
    }

    this.logger.log(`[NodeEvaluator] Evaluating ${node.nodeType} node ${node.nodeId} for month ${month}, type ${calculationType}`);

    try {
      const result = await strategy.evaluate(node, month, calculationType, enhancedContext);
      this.logger.log(`[NodeEvaluator] Node ${node.nodeId} evaluation result: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`[NodeEvaluator] Error evaluating node ${node.nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Validate a node using the appropriate strategy
   */
  validateNode(node: CalculationTreeNode): { isValid: boolean; errors: string[] } {
    const strategy = this.strategies.get(node.nodeType as NodeType);
    if (!strategy) {
      return {
        isValid: false,
        errors: [`Unknown node type: ${node.nodeType}`]
      };
    }

    return strategy.validateNode(node);
  }

  /**
   * Validate multiple nodes
   */
  validateNodes(nodes: CalculationTreeNode[]): { isValid: boolean; errors: string[] } {
    const allErrors: string[] = [];

    for (const node of nodes) {
      const validation = this.validateNode(node);
      if (!validation.isValid) {
        allErrors.push(...validation.errors.map(err => `Node ${node.nodeId}: ${err}`));
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Get all supported node types
   */
  getSupportedNodeTypes(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if a node type is supported
   */
  isNodeTypeSupported(nodeType: string): boolean {
    return this.strategies.has(nodeType as NodeType);
  }

  /**
   * Register a strategy for a specific node type
   */
  private registerStrategy(strategy: NodeEvaluationStrategy): void {
    const nodeType = strategy.getNodeType() as NodeType;
    
    if (this.strategies.has(nodeType)) {
      this.logger.warn(`[NodeEvaluator] Overriding existing strategy for node type: ${nodeType}`);
    }

    this.strategies.set(nodeType, strategy);
    this.logger.log(`[NodeEvaluator] Registered strategy for node type: ${nodeType}`);
  }

  /**
   * Evaluate multiple nodes in parallel (when they don't depend on each other)
   */
  async evaluateParallel(
    evaluations: {
      node: CalculationTreeNode;
      month: string;
      calculationType: CalculationType;
      context: CalculationContext;
    }[]
  ): Promise<(number | null)[]> {
    this.logger.log(`[NodeEvaluator] Evaluating ${evaluations.length} nodes in parallel`);

    const promises = evaluations.map(({ node, month, calculationType, context }) =>
      this.evaluate(node, month, calculationType, context)
    );

    try {
      const results = await Promise.all(promises);
      this.logger.log(`[NodeEvaluator] Parallel evaluation completed for ${evaluations.length} nodes`);
      return results;
    } catch (error) {
      this.logger.error(`[NodeEvaluator] Error in parallel evaluation:`, error);
      throw error;
    }
  }

  /**
   * Evaluate a node tree (recursively evaluate all dependencies)
   */
  async evaluateTree(
    node: CalculationTreeNode,
    month: string,
    calculationType: CalculationType,
    context: CalculationContext,
    visited: Set<string> = new Set()
  ): Promise<number | null> {
    // Prevent infinite recursion
    if (visited.has(node.nodeId)) {
      this.logger.error(`[NodeEvaluator] Circular dependency detected involving node: ${node.nodeId}`);
      throw new Error(`Circular dependency detected involving node: ${node.nodeId}`);
    }

    visited.add(node.nodeId);

    try {
      // First evaluate all children (skip for reference nodes to avoid duplication)
      if (node.children && node.children.length > 0 && !node.isReference) {
        for (const child of node.children) {
          await this.evaluateTree(child, month, calculationType, context, new Set(visited));
        }
      }

      // Then evaluate this node
      const result = await this.evaluate(node, month, calculationType, context);
      
      visited.delete(node.nodeId);
      return result;
    } catch (error) {
      visited.delete(node.nodeId);
      throw error;
    }
  }

  /**
   * Get evaluation statistics
   */
  getEvaluationStats(): {
    strategiesRegistered: number;
    supportedNodeTypes: string[];
  } {
    return {
      strategiesRegistered: this.strategies.size,
      supportedNodeTypes: this.getSupportedNodeTypes()
    };
  }

  /**
   * Clear internal caches (delegates to strategies if they have caches)
   */
  clearCaches(): void {
    this.logger.log('[NodeEvaluator] Clearing strategy caches');
    // Individual strategies can implement cache clearing if needed
    // For now, the main cache is handled by CalculationCacheService
  }
}
