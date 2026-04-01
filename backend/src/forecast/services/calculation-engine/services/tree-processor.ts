/**
 * Tree Processor Service - Phase 1.2
 * Handles tree ordering by dependencies and node flattening
 */

import { Injectable } from '@nestjs/common';
import { CalculationTree, CalculationTreeNode, OperatorNodeAttributes, SeedNodeAttributes } from '../types/calculation-types';

@Injectable()
export class TreeProcessor {

  /**
   * Order trees by dependencies to handle cross-tree references
   * SEED nodes may reference metrics from other trees, so we need proper ordering
   */
  orderByDependencies(trees: CalculationTree[]): CalculationTree[] {
    if (trees.length <= 1) {
      return [...trees];
    }

    const byRoot = new Map<string, CalculationTree>();
    const rootsOrder = new Map<string, number>();
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      byRoot.set(t.rootMetricNodeId, t);
      rootsOrder.set(t.rootMetricNodeId, i);
    }

    const roots = trees.map((t) => t.rootMetricNodeId);
    const adj = new Map<string, Set<string>>();
    const indegree = new Map<string, number>();

    for (const r of roots) {
      adj.set(r, new Set());
      indegree.set(r, 0);
    }

    // SEED sourceMetricId may reference another tree's root metric; that tree must run first.
    for (const tree of trees) {
      const r = tree.rootMetricNodeId;
      const seedDeps = new Set(this.findSeedDependencies(tree.tree));
      for (const dep of seedDeps) {
        if (dep === r || !byRoot.has(dep)) {
          continue;
        }
        const edges = adj.get(dep)!;
        if (!edges.has(r)) {
          edges.add(r);
          indegree.set(r, indegree.get(r)! + 1);
        }
      }
    }

    const orderedTrees: CalculationTree[] = [];
    const processed = new Set<string>();

    while (orderedTrees.length < trees.length) {
      const ready = roots.filter((rootId) => !processed.has(rootId) && indegree.get(rootId) === 0);
      if (ready.length === 0) {
        throw new Error(
          'Circular cross-tree SEED dependency detected (sourceMetricId graph has a cycle)'
        );
      }
      ready.sort((a, b) => rootsOrder.get(a)! - rootsOrder.get(b)!);
      const u = ready[0];
      processed.add(u);
      orderedTrees.push(byRoot.get(u)!);
      for (const v of adj.get(u) || []) {
        indegree.set(v, indegree.get(v)! - 1);
      }
    }

    return orderedTrees;
  }

  /**
   * Flatten tree to ordered list of nodes for calculation.
   * Only the root METRIC is scheduled: SEED/OPERATOR/DATA under it are evaluated
   * via the evaluator when the METRIC runs. A depth-first list that included SEED
   * before METRIC broke SEED→same-tree METRIC (t-1) and cached nulls for Feb+.
   */
  flattenToNodes(tree: CalculationTree): CalculationTreeNode[] {
    return [tree.tree];
  }

  /**
   * Full depth-first order (dependencies before parents) for materializing
   * per-node results after the METRIC run. Used so API `allNodes` includes
   * SEED/OPERATOR/DATA for visualization badges — not for first-pass execution.
   */
  flattenForIntermediateResults(tree: CalculationTree): CalculationTreeNode[] {
    const orderedNodes: CalculationTreeNode[] = [];
    const processed = new Set<string>();

    const processNode = (node: CalculationTreeNode): void => {
      if (processed.has(node.nodeId)) {
        return;
      }

      if (node.children && !node.isReference) {
        for (const child of node.children) {
          processNode(child);
        }
      }

      orderedNodes.push(node);
      processed.add(node.nodeId);
    };

    processNode(tree.tree);
    return orderedNodes;
  }

  /**
   * Get all nodes from multiple trees in dependency order
   */
  flattenAllTrees(trees: CalculationTree[]): CalculationTreeNode[] {
    const orderedTrees = this.orderByDependencies(trees);
    const allNodes: CalculationTreeNode[] = [];

    for (const tree of orderedTrees) {
      const treeNodes = this.flattenForIntermediateResults(tree);
      // Add only nodes that haven't been added yet (avoid duplicates)
      for (const node of treeNodes) {
        if (!allNodes.find(n => n.nodeId === node.nodeId)) {
          allNodes.push(node);
        }
      }
    }

    return allNodes;
  }

  /**
   * Find all SEED node dependencies in a tree
   */
  private findSeedDependencies(node: CalculationTreeNode): string[] {
    const dependencies: string[] = [];

    const traverse = (currentNode: CalculationTreeNode): void => {
      if (currentNode.nodeType === 'SEED') {
        const seedAttributes = currentNode.nodeData as SeedNodeAttributes;
        if (seedAttributes.sourceMetricId) {
          dependencies.push(seedAttributes.sourceMetricId);
        }
      }

      if (currentNode.children) {
        for (const child of currentNode.children) {
          traverse(child);
        }
      }
    };

    traverse(node);
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Validate tree structure for common issues
   */
  validateTree(tree: CalculationTree): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visitedNodes = new Set<string>();

    const validateNode = (node: CalculationTreeNode, path: string[]): void => {
      // Check for circular references within tree
      if (path.includes(node.nodeId)) {
        errors.push(`Circular reference detected in tree: ${[...path, node.nodeId].join(' -> ')}`);
        return;
      }

      // Check for duplicate node IDs (allow duplicates for reference nodes)
      if (visitedNodes.has(node.nodeId) && !node.isReference) {
        errors.push(`Duplicate node ID found: ${node.nodeId}`);
        return;
      }

      // Only add non-reference nodes to visited set to allow reference duplicates
      if (!node.isReference) {
        visitedNodes.add(node.nodeId);
      }

      // Validate node-specific constraints
      this.validateNodeConstraints(node, errors);

      // Recursively validate children (skip for reference nodes)
      if (node.children && !node.isReference) {
        for (const child of node.children) {
          validateNode(child, [...path, node.nodeId]);
        }
      }
    };

    validateNode(tree.tree, []);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate node-specific constraints
   */
  private validateNodeConstraints(node: CalculationTreeNode, errors: string[]): void {
    switch (node.nodeType) {
      case 'OPERATOR': {
        const opAttrs = node.nodeData as OperatorNodeAttributes | undefined;
        if (opAttrs?.op === 'offset') {
          if (!node.isReference && (!node.children || node.children.length !== 1)) {
            errors.push(`OPERATOR offset node ${node.nodeId} must have exactly one child`);
          }
        } else if (!node.isReference && (!node.children || node.children.length === 0)) {
          errors.push(`OPERATOR node ${node.nodeId} must have at least one child`);
        }
        break;
      }

      case 'METRIC':
        // Reference nodes don't need children since they point to calculations elsewhere
        if (!node.isReference && (!node.children || node.children.length !== 1)) {
          errors.push(`METRIC node ${node.nodeId} must have exactly one child`);
        }
        break;

      case 'DATA':
      case 'CONSTANT':
        if (node.children && node.children.length > 0 && !node.isReference) {
          errors.push(`${node.nodeType} node ${node.nodeId} should not have children`);
        }
        break;

      case 'SEED':
        if (node.children && node.children.length > 0 && !node.isReference) {
          errors.push(`SEED node ${node.nodeId} should not have children`);
        }
        const seedAttributes = node.nodeData as SeedNodeAttributes;
        if (!seedAttributes || !seedAttributes.sourceMetricId) {
          errors.push(`SEED node ${node.nodeId} must have sourceMetricId`);
        }
        break;

      default:
        errors.push(`Unknown node type: ${node.nodeType}`);
    }
  }

  /**
   * Get all metric node IDs from trees
   */
  getMetricNodeIds(trees: CalculationTree[]): string[] {
    return trees.map(tree => tree.rootMetricNodeId);
  }

  /**
   * Find tree containing specific node ID
   */
  findTreeContainingNode(trees: CalculationTree[], nodeId: string): CalculationTree | null {
    for (const tree of trees) {
      if (this.treeContainsNode(tree.tree, nodeId)) {
        return tree;
      }
    }
    return null;
  }

  /**
   * Check if tree contains specific node ID
   */
  private treeContainsNode(node: CalculationTreeNode, nodeId: string): boolean {
    if (node.nodeId === nodeId) {
      return true;
    }

    if (node.children && !node.isReference) {
      for (const child of node.children) {
        if (this.treeContainsNode(child, nodeId)) {
          return true;
        }
      }
    }

    return false;
  }
}
