import { TreeProcessor } from '../tree-processor';
import type { CalculationTree, CalculationTreeNode, SeedNodeAttributes } from '../../types/calculation-types';

function makeMetricWithSeed(
  rootMetricId: string,
  seedSourceMetricId: string
): CalculationTree {
  const seed: CalculationTreeNode = {
    nodeId: `seed-under-${rootMetricId}`,
    nodeType: 'SEED',
    nodeData: { sourceMetricId: seedSourceMetricId } as SeedNodeAttributes,
    children: []
  };
  const metric: CalculationTreeNode = {
    nodeId: rootMetricId,
    nodeType: 'METRIC',
    nodeData: {},
    children: [seed]
  };
  return { rootMetricNodeId: rootMetricId, tree: metric };
}

describe('TreeProcessor.orderByDependencies', () => {
  const processor = new TreeProcessor();

  it('orders dependent tree after source metric tree (cross-tree SEED)', () => {
    const dep = 'metric-dependent';
    const src = 'metric-source';
    const trees: CalculationTree[] = [
      makeMetricWithSeed(dep, src),
      makeMetricWithSeed(src, src)
    ];

    const ordered = processor.orderByDependencies(trees);
    expect(ordered.map((t) => t.rootMetricNodeId)).toEqual([src, dep]);
  });

  it('preserves input order when no cross-tree SEED edges exist', () => {
    const a = 'm-a';
    const b = 'm-b';
    const trees: CalculationTree[] = [
      makeMetricWithSeed(a, a),
      makeMetricWithSeed(b, b)
    ];

    const ordered = processor.orderByDependencies(trees);
    expect(ordered.map((t) => t.rootMetricNodeId)).toEqual([a, b]);
  });

  it('throws when cross-tree SEED dependencies form a cycle', () => {
    const a = 'm-a';
    const b = 'm-b';
    const trees: CalculationTree[] = [
      makeMetricWithSeed(a, b),
      makeMetricWithSeed(b, a)
    ];

    expect(() => processor.orderByDependencies(trees)).toThrow(/Circular cross-tree SEED/);
  });
});
