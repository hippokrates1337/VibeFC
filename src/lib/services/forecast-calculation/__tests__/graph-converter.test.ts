import { GraphConverter } from '../graph-converter';
import { ForecastNodeClient, ForecastEdgeClient, ForecastNodeKind } from '@/lib/store/forecast-graph-store';

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
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Test Constant', value: 100 }
        },
        {
          id: 'metric-1',
          type: 'METRIC',
          position: { x: 200, y: 0 },
          data: { label: 'Revenue', budgetVariableId: '', historicalVariableId: '', useCalculated: false }
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
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Constant 1', value: 100 }
        },
        {
          id: 'node-2',
          type: 'OPERATOR',
          position: { x: 100, y: 0 },
          data: { op: '+', inputOrder: ['node-1', 'node-3'] }
        },
        {
          id: 'node-3',
          type: 'OPERATOR',
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
      expect(result.errors).toContain('Graph contains cycles - forecast graphs must be acyclic');
    });

    it('should detect orphaned nodes as warnings', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Constant 1', value: 100 }
        },
        {
          id: 'orphan-1',
          type: 'CONSTANT',
          position: { x: 200, y: 0 },
          data: { name: 'Orphan', value: 200 }
        }
      ];

      const edges: ForecastEdgeClient[] = [];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Node orphan-1 (CONSTANT) is not connected to any other nodes');
      expect(result.warnings).toContain('Node constant-1 (CONSTANT) is not connected to any other nodes');
      expect(result.errors).toContain('Graph must contain at least one METRIC node');
    });

    it('should require at least one metric node', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Constant 1', value: 100 }
        }
      ];

      const edges: ForecastEdgeClient[] = [];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Graph must contain at least one METRIC node');
    });

    it('should validate multiple inputs only for operator nodes', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Constant 1', value: 100 }
        },
        {
          id: 'constant-2',
          type: 'CONSTANT',
          position: { x: 0, y: 100 },
          data: { name: 'Constant 2', value: 200 }
        },
        {
          id: 'metric-1',
          type: 'METRIC',
          position: { x: 200, y: 50 },
          data: { label: 'Total', budgetVariableId: '', historicalVariableId: '', useCalculated: false }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        { id: 'edge-1', source: 'constant-1', target: 'metric-1' },
        { id: 'edge-2', source: 'constant-2', target: 'metric-1' }
      ];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Node metric-1 (METRIC) has 2 inputs but only OPERATOR nodes can accept multiple inputs');
    });

    it('should validate seed node references', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'seed-1',
          type: 'SEED',
          position: { x: 0, y: 0 },
          data: { sourceMetricId: '' } // Empty sourceMetricId
        },
        {
          id: 'metric-1',
          type: 'METRIC',
          position: { x: 200, y: 0 },
          data: { label: 'Revenue', budgetVariableId: '', historicalVariableId: '', useCalculated: false }
        }
      ];

      const edges: ForecastEdgeClient[] = [
        { id: 'edge-1', source: 'seed-1', target: 'metric-1' }
      ];

      const result = graphConverter.validateGraph(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SEED node seed-1 missing required sourceMetricId');
    });
  });

  describe('convertToTrees', () => {
    it('should convert simple graph to calculation trees', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Constant 1', value: 100 }
        },
        {
          id: 'metric-1',
          type: 'METRIC',
          position: { x: 200, y: 0 },
          data: { label: 'Revenue', budgetVariableId: '', historicalVariableId: '', useCalculated: false }
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
      expect(trees[0].rootMetricNodeId).toBe('metric-1');
      expect(trees[0].tree.nodeId).toBe('metric-1');
      expect(trees[0].tree.nodeType).toBe('METRIC');
      expect(trees[0].tree.children).toHaveLength(1);
      expect(trees[0].tree.children[0].nodeId).toBe('constant-1');
    });

    it('should handle complex graph with multiple metrics', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Constant 1', value: 100 }
        },
        {
          id: 'constant-2',
          type: 'CONSTANT',
          position: { x: 0, y: 100 },
          data: { name: 'Constant 2', value: 200 }
        },
        {
          id: 'operator-1',
          type: 'OPERATOR',
          position: { x: 200, y: 50 },
          data: { op: '+', inputOrder: ['constant-1', 'constant-2'] }
        },
        {
          id: 'metric-1',
          type: 'METRIC',
          position: { x: 400, y: 0 },
          data: { label: 'Revenue', budgetVariableId: '', historicalVariableId: '', useCalculated: false }
        },
        {
          id: 'metric-2',
          type: 'METRIC',
          position: { x: 400, y: 100 },
          data: { label: 'Cost', budgetVariableId: '', historicalVariableId: '', useCalculated: false }
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
      
      const revenueTree = trees.find(t => t.rootMetricNodeId === 'metric-1');
      const costTree = trees.find(t => t.rootMetricNodeId === 'metric-2');
      
      expect(revenueTree).toBeDefined();
      expect(costTree).toBeDefined();
      
      expect(revenueTree!.tree.children).toHaveLength(1);
      expect(revenueTree!.tree.children[0].nodeId).toBe('operator-1');
      
      expect(costTree!.tree.children).toHaveLength(1);
      expect(costTree!.tree.children[0].nodeId).toBe('constant-2');
    });

    it('should throw error for invalid graph', () => {
      const nodes: ForecastNodeClient[] = [
        {
          id: 'constant-1',
          type: 'CONSTANT',
          position: { x: 0, y: 0 },
          data: { name: 'Constant 1', value: 100 }
        }
      ];

      const edges: ForecastEdgeClient[] = [];

      expect(() => {
        graphConverter.convertToTrees(nodes, edges);
      }).toThrow('Invalid graph');
    });
  });


}); 