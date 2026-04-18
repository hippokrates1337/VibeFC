import { describe, expect, test } from '@jest/globals';
import {
  buildHierarchicalStructure,
  flattenHierarchyDeep
} from '../forecast-hierarchy';
import type { ForecastEdgeClient, ForecastNodeClient } from '@/lib/store/forecast-graph-store/types';

function metric(id: string, label: string): ForecastNodeClient {
  return {
    id,
    type: 'METRIC',
    position: { x: 0, y: 0 },
    data: {
      label,
      budgetVariableId: 'b',
      historicalVariableId: 'h',
      useCalculated: true
    }
  } as ForecastNodeClient;
}

function dataNode(id: string, name: string): ForecastNodeClient {
  return {
    id,
    type: 'DATA',
    position: { x: 0, y: 0 },
    data: { name, variableId: 'v', offsetMonths: 0 }
  } as ForecastNodeClient;
}

describe('buildHierarchicalStructure', () => {
  test('shared child (multi-parent edges) appears once under canonical parent only', () => {
    const m1 = metric('m1', 'M1');
    const m2 = metric('m2', 'M2');
    const d = dataNode('d', 'Shared');
    const nodes = [m1, m2, d];
    const edges: ForecastEdgeClient[] = [
      { id: 'e1', source: 'd', target: 'm1' },
      { id: 'e2', source: 'd', target: 'm2' }
    ];
    const hierarchy = buildHierarchicalStructure(nodes, edges, {
      edgeDirection: 'targetIsParent',
      expandedNodes: new Set(['m1', 'm2', 'd'])
    });
    const flat = flattenHierarchyDeep(hierarchy);
    expect(flat.filter((x) => x.id === 'd').length).toBe(1);

    const m1Tree = hierarchy.find((h) => h.id === 'm1');
    expect(m1Tree?.children.map((c) => c.id)).toEqual([]);

    const m2Tree = hierarchy.find((h) => h.id === 'm2');
    expect(m2Tree?.children.map((c) => c.id)).toEqual(['d']);
  });
});
