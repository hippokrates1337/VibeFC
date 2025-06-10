import { act, renderHook } from '@/test-utils';
import { NodeChange, EdgeChange } from 'reactflow';
import { 
  useForecastGraphStore, 
  ForecastNodeClient, 
  ForecastEdgeClient,
  ForecastNodeKind
} from '../forecast-graph-store';

jest.mock('@reactflow/background', () => ({
  BackgroundVariant: { Dots: 'dots' }
}));

const mockUuid = {
  currentId: 0,
  v4: function() {
    return `test-id-${this.currentId++}`;
  }
};

jest.mock('uuid', () => ({
  v4: () => mockUuid.v4()
}));

describe('forecast-graph-store', () => {
  // Clear the store and localStorage before each test
  beforeEach(() => {
    // Reset the mock UUID counter
    mockUuid.currentId = 0;
    
    // Reset the store to initial state
    const { result } = renderHook(() => useForecastGraphStore());
    act(() => {
      result.current.resetStore();
    });

    // Clear localStorage
    localStorage.clear();
  });

  // Test initial state
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    expect(result.current.forecastId).toBeNull();
    expect(result.current.forecastName).toBe('');
    expect(result.current.forecastStartDate).toBeNull();
    expect(result.current.forecastEndDate).toBeNull();
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Test loadForecast action
  it('should load forecast data', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    const mockForecast = {
      id: 'forecast-1',
      name: 'Test Forecast',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      organizationId: null,
      nodes: [
        {
          id: 'node-1',
          type: 'CONSTANT' as ForecastNodeKind,
          position: { x: 100, y: 100 },
          data: { value: 42 }
        }
      ] as ForecastNodeClient[],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2'
        }
      ] as ForecastEdgeClient[]
    };
    
    act(() => {
      result.current.loadForecast(mockForecast);
    });
    
    expect(result.current.forecastId).toBe('forecast-1');
    expect(result.current.forecastName).toBe('Test Forecast');
    expect(result.current.forecastStartDate).toBe('2023-01-01');
    expect(result.current.forecastEndDate).toBe('2023-12-31');
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.isDirty).toBe(false);
  });

  // Test setForecastMetadata action
  it('should update forecast metadata', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    // First load a forecast
    act(() => {
      result.current.loadForecast({
        id: 'forecast-1',
        name: 'Old Name',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        organizationId: null,
        nodes: [],
        edges: []
      });
    });
    
    // Then update its metadata
    act(() => {
      result.current.setForecastMetadata({
        name: 'New Name',
        startDate: '2023-02-01',
        endDate: '2023-11-30'
      });
    });
    
    expect(result.current.forecastName).toBe('New Name');
    expect(result.current.forecastStartDate).toBe('2023-02-01');
    expect(result.current.forecastEndDate).toBe('2023-11-30');
    expect(result.current.isDirty).toBe(true);
  });

  // Test partial metadata updates
  it('should allow partial metadata updates', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    // First load a forecast
    act(() => {
      result.current.loadForecast({
        id: 'forecast-1',
        name: 'Old Name',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        organizationId: null,
        nodes: [],
        edges: []
      });
    });
    
    // Update just the name
    act(() => {
      result.current.setForecastMetadata({
        name: 'New Name'
      });
    });
    
    expect(result.current.forecastName).toBe('New Name');
    expect(result.current.forecastStartDate).toBe('2023-01-01'); // Unchanged
    expect(result.current.forecastEndDate).toBe('2023-12-31'); // Unchanged
    expect(result.current.isDirty).toBe(true);
  });

  // Test addNode action
  it('should add a node with default data based on type', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    // Add a constant node
    act(() => {
      result.current.addNode({
        type: 'CONSTANT',
        data: {},
        position: { x: 200, y: 200 }
      });
    });
    
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].id).toBe('test-id-0');
    expect(result.current.nodes[0].type).toBe('CONSTANT');
    expect(result.current.nodes[0].position).toEqual({ x: 200, y: 200 });
    
    // Type assertion to access the specific type properties
    const nodeData = result.current.nodes[0].data as { value: number };
    expect(nodeData.value).toBe(0);
    
    expect(result.current.isDirty).toBe(true);
  });

  // Test addNode with different node types
  it('should initialize correct defaults for different node types', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    // Test all node types
    const nodeTypes: ForecastNodeKind[] = ['DATA', 'CONSTANT', 'OPERATOR', 'METRIC', 'SEED'];
    
    nodeTypes.forEach(type => {
      act(() => {
        result.current.addNode({
          type,
          data: {},
        });
      });
    });
    
    expect(result.current.nodes).toHaveLength(5);
    
    // Check DATA node
    const dataNode = result.current.nodes.find(node => node.type === 'DATA');
    expect(dataNode?.data).toEqual({ name: 'New Data Node', variableId: '', offsetMonths: 0 });
    
    // Check CONSTANT node - Updated to include name field
    const constantNode = result.current.nodes.find(node => node.type === 'CONSTANT');
    expect(constantNode?.data).toEqual({ name: 'New Constant', value: 0 });
    
    // Check OPERATOR node
    const operatorNode = result.current.nodes.find(node => node.type === 'OPERATOR');
    expect(operatorNode?.data).toEqual({ op: '+', inputOrder: [] });
    
    // Check METRIC node - Updated to include label field
    const metricNode = result.current.nodes.find(node => node.type === 'METRIC');
    expect(metricNode?.data).toEqual({ label: 'New Metric', budgetVariableId: '', historicalVariableId: '', useCalculated: false });
    
    // Check SEED node
    const seedNode = result.current.nodes.find(node => node.type === 'SEED');
    expect(seedNode?.data).toEqual({ sourceMetricId: '' });
  });

  // Test updateNodeData action
  it('should update node data', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId = '';
    
    // Add a node first
    act(() => {
      const id = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId = id as string;
    });
    
    // Then update its data
    act(() => {
      result.current.updateNodeData(nodeId, { value: 50 });
    });
    
    // Type assertion to access the specific type properties
    const nodeData = result.current.nodes[0].data as { value: number };
    expect(nodeData.value).toBe(50);
    expect(result.current.isDirty).toBe(true);
  });

  // Test updateNodePosition action
  it('should update node position', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId = '';
    
    // Add a node first
    act(() => {
      const id = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 },
        position: { x: 100, y: 100 }
      });
      nodeId = id as string;
    });
    
    // Then update its position
    act(() => {
      result.current.updateNodePosition(nodeId, { x: 200, y: 300 });
    });
    
    expect(result.current.nodes[0].position).toEqual({ x: 200, y: 300 });
    expect(result.current.isDirty).toBe(true);
  });

  // Test deleteNode action
  it('should delete a node', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId = '';
    
    // Add a node
    act(() => {
      const id = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId = id as string;
    });
    
    // Delete the node
    act(() => {
      result.current.deleteNode(nodeId);
    });
    
    expect(result.current.nodes).toHaveLength(0);
    expect(result.current.isDirty).toBe(true);
  });

  // Test deleteNode also removes connected edges
  it('should delete a node and its connected edges', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId1 = '';
    let nodeId2 = '';
    
    // Add two nodes
    act(() => {
      const id1 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId1 = id1 as string;
      
      const id2 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 20 }
      });
      nodeId2 = id2 as string;
    });
    
    // Add an edge between them
    act(() => {
      result.current.addEdge({
        source: nodeId1,
        target: nodeId2
      });
    });
    
    expect(result.current.edges).toHaveLength(1);
    
    // Delete the source node
    act(() => {
      result.current.deleteNode(nodeId1);
    });
    
    // Check that the edge was also deleted
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.edges).toHaveLength(0);
  });

  // Test addEdge action
  it('should add an edge', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId1 = '';
    let nodeId2 = '';
    
    // Add two nodes
    act(() => {
      const id1 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId1 = id1 as string;
      
      const id2 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 20 }
      });
      nodeId2 = id2 as string;
    });
    
    // Add an edge between them
    let edgeId = '';
    act(() => {
      const id = result.current.addEdge({
        source: nodeId1,
        target: nodeId2
      });
      edgeId = id as string;
    });
    
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.edges[0].id).toBe('test-id-2');
    expect(result.current.edges[0].source).toBe(nodeId1);
    expect(result.current.edges[0].target).toBe(nodeId2);
    expect(result.current.isDirty).toBe(true);
  });

  // Test deleteEdge action
  it('should delete an edge', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId1 = '';
    let nodeId2 = '';
    let edgeId = '';
    
    // Add two nodes
    act(() => {
      const id1 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId1 = id1 as string;
      
      const id2 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 20 }
      });
      nodeId2 = id2 as string;
    });
    
    // Add an edge between them
    act(() => {
      const id = result.current.addEdge({
        source: nodeId1,
        target: nodeId2
      });
      edgeId = id as string;
    });
    
    // Delete the edge
    act(() => {
      result.current.deleteEdge(edgeId);
    });
    
    expect(result.current.edges).toHaveLength(0);
    expect(result.current.isDirty).toBe(true);
  });

  // Test onNodesChange action for position changes (should not mark dirty)
  it('should apply node position changes without marking dirty', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId = '';
    
    // Add a node
    act(() => {
      const id = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 },
        position: { x: 100, y: 100 }
      });
      nodeId = id as string;
      
      // Reset dirty state for testing
      result.current.setDirty(false);
    });
    
    // Create position change
    const changes: NodeChange[] = [
      {
        type: 'position',
        id: nodeId,
        position: { x: 200, y: 200 },
        positionAbsolute: { x: 200, y: 200 },
      }
    ];
    
    // Apply changes
    act(() => {
      result.current.onNodesChange(changes);
    });
    
    // Check that the position was updated
    expect(result.current.nodes[0].position).toEqual({ x: 200, y: 200 });
    // Position changes should NOT mark the store as dirty (by design)
    expect(result.current.isDirty).toBe(false);
  });

  // Test onNodesChange action for structural changes (should mark dirty)
  it('should apply node removal and mark store as dirty', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId = '';
    
    // Add a node first
    act(() => {
      const id = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId = id as string;
      
      // Reset dirty state for testing
      result.current.setDirty(false);
    });
    
    // Create remove change (structural change)
    const changes: NodeChange[] = [
      {
        type: 'remove',
        id: nodeId,
      }
    ];
    
    // Apply changes
    act(() => {
      result.current.onNodesChange(changes);
    });
    
    // Check that the node was removed and store is marked dirty
    expect(result.current.nodes).toHaveLength(0);
    expect(result.current.isDirty).toBe(true);
  });

  // Test onEdgesChange action
  it('should apply edge changes', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId1 = '';
    let nodeId2 = '';
    let edgeId = '';
    
    act(() => {
      const id1 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId1 = id1 as string;
      
      const id2 = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 20 }
      });
      nodeId2 = id2 as string;
      
      const id = result.current.addEdge({
        source: nodeId1,
        target: nodeId2
      });
      edgeId = id as string;
      
      // Reset dirty state for testing
      result.current.setDirty(false);
    });
    
    // Create remove edge change
    const changes: EdgeChange[] = [
      {
        type: 'remove',
        id: edgeId,
      }
    ];
    
    // Apply changes
    act(() => {
      result.current.onEdgesChange(changes);
    });
    
    // Check that the edge was removed
    expect(result.current.edges).toHaveLength(0);
    expect(result.current.isDirty).toBe(true);
  });

  // Test setSelectedNodeId action
  it('should set selected node id', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    let nodeId = '';
    
    // Add a node
    act(() => {
      const id = result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      nodeId = id as string;
    });
    
    // Select the node
    act(() => {
      result.current.setSelectedNodeId(nodeId);
    });
    
    expect(result.current.selectedNodeId).toBe(nodeId);
    
    // Deselect the node
    act(() => {
      result.current.setSelectedNodeId(null);
    });
    
    expect(result.current.selectedNodeId).toBeNull();
  });

  // Test setDirty action
  it('should set dirty state', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    // Set dirty to true
    act(() => {
      result.current.setDirty(true);
    });
    
    expect(result.current.isDirty).toBe(true);
    
    // Set dirty to false
    act(() => {
      result.current.setDirty(false);
    });
    
    expect(result.current.isDirty).toBe(false);
  });

  // Test resetStore action
  it('should reset store to initial state', () => {
    const { result } = renderHook(() => useForecastGraphStore());
    
    // Load a forecast and make changes
    act(() => {
      result.current.loadForecast({
        id: 'forecast-1',
        name: 'Test Forecast',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        organizationId: null,
        nodes: [],
        edges: []
      });
      
      result.current.addNode({
        type: 'CONSTANT',
        data: { value: 10 }
      });
      
      result.current.setSelectedNodeId('some-id');
      result.current.setDirty(true);
    });
    
    // Reset the store
    act(() => {
      result.current.resetStore();
    });
    
    // Check that store is back to initial state
    expect(result.current.forecastId).toBeNull();
    expect(result.current.forecastName).toBe('');
    expect(result.current.forecastStartDate).toBeNull();
    expect(result.current.forecastEndDate).toBeNull();
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.selectedNodeId).toBeNull();
  });
}); 