import { GraphConverter } from '../graph-converter';
import { ForecastNodeClient, ForecastEdgeClient, ForecastNodeKind } from '@/types/forecast';

describe('GraphConverter', () => {
  let graphConverter: GraphConverter;

  beforeEach(() => {
    graphConverter = new GraphConverter();
  });

  describe('validateGraph', () => {
    it('should validate a simple valid graph', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        },
        {
          id: 'metric-1',
          type: ForecastNodeKind.METRIC,
          position: { x: 200, y: 0 },
          data: { name: 'Revenue' }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        {
          id: 'edge-1',
          source: 'constant-1',
          target: 'metric-1'
        }
      ];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect cycles in graph', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'node-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        },
        {
          id: 'node-2',
          type: ForecastNodeKind.OPERATOR,
          position: { x: 100, y: 0 },
          data: { op: '+', inputOrder: ['node-1', 'node-3'] }
        },
        {
          id: 'node-3',
          type: ForecastNodeKind.OPERATOR,
          position: { x: 200, y: 0 },
          data: { op: '*', inputOrder: ['node-2', 'node-1'] }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
        { id: 'edge-3', source: 'node-3', target: 'node-2' } // Creates cycle
      ];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Graph contains cycles');
    });

    it('should detect orphaned nodes', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        },
        {
          id: 'orphan-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 200, y: 0 },
          data: { value: 200 }
        }
      ];

      const edges: ForecastEdgeClient[] = [];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Orphaned nodes found: orphan-1, constant-1');
    });

    it('should require at least one metric node', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        }
      ];

      const edges: ForecastEdgeClient[] = [];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one METRIC node is required');
    });

    it('should validate operator node input order', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        },
        {
          id: 'constant-2',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 100 },
          data: { value: 200 }
        },
        {
          id: 'operator-1',
          type: ForecastNodeKind.OPERATOR,
          position: { x: 200, y: 50 },
          data: { op: '+', inputOrder: ['constant-1', 'nonexistent-node'] }
        },
        {
          id: 'metric-1',
          type: ForecastNodeKind.METRIC,
          position: { x: 400, y: 50 },
          data: { name: 'Total' }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        { id: 'edge-1', source: 'constant-1', target: 'operator-1' },
        { id: 'edge-2', source: 'constant-2', target: 'operator-1' },
        { id: 'edge-3', source: 'operator-1', target: 'metric-1' }
      ];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OPERATOR node operator-1 references non-existent input: nonexistent-node');
    });

    it('should validate data node variable references', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'data-1',
          type: ForecastNodeKind.DATA,
          position: { x: 0, y: 0 },
          data: { variableId: '', offsetMonths: 0 } // Empty variableId
        },
        {
          id: 'metric-1',
          type: ForecastNodeKind.METRIC,
          position: { x: 200, y: 0 },
          data: { name: 'Revenue' }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        { id: 'edge-1', source: 'data-1', target: 'metric-1' }
      ];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('DATA node data-1 has invalid variableId');
    });
  });

  describe('convertToTrees', () => {
    it('should convert simple graph to calculation trees', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        },
        {
          id: 'metric-1',
          type: ForecastNodeKind.METRIC,
          position: { x: 200, y: 0 },
          data: { name: 'Revenue' }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        {
          id: 'edge-1',
          source: 'constant-1',
          target: 'metric-1'
        }
      ];

      const trees = graphConverter.convertToTrees(nodes, edges);

      expect(trees).toHaveLength(1);
      expect(trees[0].rootNode.id).toBe('metric-1');
      expect(trees[0].rootNode.type).toBe(ForecastNodeKind.METRIC);
      expect(trees[0].rootNode.children).toHaveLength(1);
      expect(trees[0].rootNode.children[0].id).toBe('constant-1');
    });

    it('should handle complex graph with multiple metrics', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        },
        {
          id: 'constant-2',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 100 },
          data: { value: 200 }
        },
        {
          id: 'operator-1',
          type: ForecastNodeKind.OPERATOR,
          position: { x: 200, y: 50 },
          data: { op: '+', inputOrder: ['constant-1', 'constant-2'] }
        },
        {
          id: 'metric-1',
          type: ForecastNodeKind.METRIC,
          position: { x: 400, y: 0 },
          data: { name: 'Revenue' }
        },
        {
          id: 'metric-2',
          type: ForecastNodeKind.METRIC,
          position: { x: 400, y: 100 },
          data: { name: 'Cost' }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        { id: 'edge-1', source: 'constant-1', target: 'operator-1' },
        { id: 'edge-2', source: 'constant-2', target: 'operator-1' },
        { id: 'edge-3', source: 'operator-1', target: 'metric-1' },
        { id: 'edge-4', source: 'constant-2', target: 'metric-2' }
      ];

      const trees = graphConverter.convertToTrees(nodes, edges);

      expect(trees).toHaveLength(2);
      
      const revenueTree = trees.find(t => t.rootNode.id === 'metric-1');
      const costTree = trees.find(t => t.rootNode.id === 'metric-2');
      
      expect(revenueTree).toBeDefined();
      expect(costTree).toBeDefined();
      
      expect(revenueTree!.rootNode.children).toHaveLength(1);
      expect(revenueTree!.rootNode.children[0].id).toBe('operator-1');
      
      expect(costTree!.rootNode.children).toHaveLength(1);
      expect(costTree!.rootNode.children[0].id).toBe('constant-2');
    });

    it('should throw error for invalid graph', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        }
      ];

      const edges: ForecastEdgeClient[] = [];

      expect(() => {
        graphConverter.convertToTrees(nodes, edges);
      }).toThrow('Graph validation failed');
    });
  });

  describe('findMetricNodes', () => {
    it('should identify metric nodes correctly', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: ForecastNodeKind.CONSTANT,
          position: { x: 0, y: 0 },
          data: { value: 100 }
        },
        {
          id: 'metric-1',
          type: ForecastNodeKind.METRIC,
          position: { x: 200, y: 0 },
          data: { name: 'Revenue' }
        },
        {
          id: 'metric-2',
          type: ForecastNodeKind.METRIC,
          position: { x: 200, y: 100 },
          data: { name: 'Cost' }
        }
      ];

      const metricNodes = graphConverter.findMetricNodes(nodes);

      expect(metricNodes).toHaveLength(2);
      expect(metricNodes.map(n => n.id)).toContain('metric-1');
      expect(metricNodes.map(n => n.id)).toContain('metric-2');
    });
  });
}); 