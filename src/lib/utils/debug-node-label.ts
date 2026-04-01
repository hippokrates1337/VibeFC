import type { DebugCalculationTree, DebugTreeNode } from '@/types/debug';

/**
 * Human-readable label for a debug tree node (same rules as calculation tree visualization).
 */
export function getDebugNodeLabel(node: DebugTreeNode): string {
  const nodeData = node.nodeData as Record<string, unknown> | undefined;

  switch (node.nodeType) {
    case 'METRIC':
      return (nodeData?.label as string) || 'Unnamed Metric';
    case 'DATA':
      return (nodeData?.name as string) || 'Data Node';
    case 'CONSTANT':
      return `Constant: ${nodeData?.value !== undefined ? String(nodeData.value) : 'N/A'}`;
    case 'OPERATOR':
      return `${(nodeData?.op as string) || 'Op'} (${node.children?.length || 0} inputs)`;
    case 'SEED':
      return 'Seed Node';
    default:
      return 'Unknown Node';
  }
}

function walkTree(node: DebugTreeNode, out: DebugTreeNode[]): void {
  out.push(node);
  node.children?.forEach((child) => walkTree(child, out));
}

/**
 * Flatten all nodes from root metric trees in document order.
 */
export function flattenDebugTreeNodes(trees: DebugTreeNode[]): DebugTreeNode[] {
  const out: DebugTreeNode[] = [];
  trees.forEach((root) => walkTree(root, out));
  return out;
}

/**
 * Map node id to display label for step log and related UI.
 */
export function buildDebugNodeIdToLabelMap(tree: DebugCalculationTree): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of flattenDebugTreeNodes(tree.trees)) {
    map.set(node.nodeId, getDebugNodeLabel(node));
  }
  return map;
}
