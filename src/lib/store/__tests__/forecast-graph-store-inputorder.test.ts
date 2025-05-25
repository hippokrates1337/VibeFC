import { useForecastGraphStore } from '../forecast-graph-store';

describe('ForecastGraphStore - InputOrder Updates', () => {
  beforeEach(() => {
    // Reset store before each test
    useForecastGraphStore.getState().resetStore();
  });

  it('should update inputOrder when edges are added to operator nodes', () => {
    const store = useForecastGraphStore.getState();
    
    // Add an operator node
    const operatorNodeId = store.addNode({
      type: 'OPERATOR',
      data: { op: '+' },
      position: { x: 200, y: 200 }
    });
    
    // Add two data nodes
    const dataNode1Id = store.addNode({
      type: 'DATA',
      data: { name: 'Data 1', variableId: 'var1', offsetMonths: 0 },
      position: { x: 100, y: 100 }
    });
    
    const dataNode2Id = store.addNode({
      type: 'DATA',
      data: { name: 'Data 2', variableId: 'var2', offsetMonths: 0 },
      position: { x: 100, y: 300 }
    });
    
    // Initially, operator should have empty inputOrder
    let operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect(operatorNode?.data).toMatchObject({ op: '+', inputOrder: [] });
    
    // Add first edge
    store.addEdge({ source: dataNode1Id, target: operatorNodeId });
    
    // Check that inputOrder is updated
    operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect(operatorNode?.data).toMatchObject({ 
      op: '+', 
      inputOrder: [dataNode1Id] 
    });
    
    // Add second edge
    store.addEdge({ source: dataNode2Id, target: operatorNodeId });
    
    // Check that inputOrder contains both inputs
    operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect(operatorNode?.data).toMatchObject({ 
      op: '+', 
      inputOrder: expect.arrayContaining([dataNode1Id, dataNode2Id])
    });
    expect((operatorNode?.data as any).inputOrder).toHaveLength(2);
  });

  it('should update inputOrder when edges are removed from operator nodes', () => {
    const store = useForecastGraphStore.getState();
    
    // Add nodes and edges
    const operatorNodeId = store.addNode({
      type: 'OPERATOR',
      data: { op: '*' },
      position: { x: 200, y: 200 }
    });
    
    const dataNode1Id = store.addNode({
      type: 'DATA',
      data: { name: 'Data 1', variableId: 'var1', offsetMonths: 0 },
      position: { x: 100, y: 100 }
    });
    
    const dataNode2Id = store.addNode({
      type: 'DATA',
      data: { name: 'Data 2', variableId: 'var2', offsetMonths: 0 },
      position: { x: 100, y: 300 }
    });
    
    const edge1Id = store.addEdge({ source: dataNode1Id, target: operatorNodeId });
    const edge2Id = store.addEdge({ source: dataNode2Id, target: operatorNodeId });
    
    // Verify both edges are connected
    let operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect((operatorNode?.data as any).inputOrder).toHaveLength(2);
    
    // Remove one edge
    store.deleteEdge(edge1Id);
    
    // Check that inputOrder is updated
    operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect(operatorNode?.data).toMatchObject({ 
      op: '*', 
      inputOrder: [dataNode2Id] 
    });
    
    // Remove the second edge
    store.deleteEdge(edge2Id);
    
    // Check that inputOrder is empty
    operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect(operatorNode?.data).toMatchObject({ 
      op: '*', 
      inputOrder: [] 
    });
  });

  it('should update inputOrder when a connected node is deleted', () => {
    const store = useForecastGraphStore.getState();
    
    // Add nodes and edges
    const operatorNodeId = store.addNode({
      type: 'OPERATOR',
      data: { op: '-' },
      position: { x: 200, y: 200 }
    });
    
    const dataNode1Id = store.addNode({
      type: 'DATA',
      data: { name: 'Data 1', variableId: 'var1', offsetMonths: 0 },
      position: { x: 100, y: 100 }
    });
    
    const dataNode2Id = store.addNode({
      type: 'DATA',
      data: { name: 'Data 2', variableId: 'var2', offsetMonths: 0 },
      position: { x: 100, y: 300 }
    });
    
    store.addEdge({ source: dataNode1Id, target: operatorNodeId });
    store.addEdge({ source: dataNode2Id, target: operatorNodeId });
    
    // Verify both edges are connected
    let operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect((operatorNode?.data as any).inputOrder).toHaveLength(2);
    
    // Delete one of the connected nodes
    store.deleteNode(dataNode1Id);
    
    // Check that inputOrder is updated and the deleted node is removed
    operatorNode = useForecastGraphStore.getState().nodes.find(n => n.id === operatorNodeId);
    expect(operatorNode?.data).toMatchObject({ 
      op: '-', 
      inputOrder: [dataNode2Id] 
    });
  });

  it('should not affect non-operator nodes', () => {
    const store = useForecastGraphStore.getState();
    
    // Add a data node and constant node
    const dataNodeId = store.addNode({
      type: 'DATA',
      data: { name: 'Data 1', variableId: 'var1', offsetMonths: 0 },
      position: { x: 100, y: 100 }
    });
    
    const constantNodeId = store.addNode({
      type: 'CONSTANT',
      data: { value: 42 },
      position: { x: 200, y: 200 }
    });
    
    // Add edge between them
    store.addEdge({ source: dataNodeId, target: constantNodeId });
    
    // Verify that non-operator nodes are not affected
    const currentState = useForecastGraphStore.getState();
    const dataNode = currentState.nodes.find(n => n.id === dataNodeId);
    const constantNode = currentState.nodes.find(n => n.id === constantNodeId);
    
    expect(dataNode?.data).not.toHaveProperty('inputOrder');
    expect(constantNode?.data).not.toHaveProperty('inputOrder');
  });
}); 