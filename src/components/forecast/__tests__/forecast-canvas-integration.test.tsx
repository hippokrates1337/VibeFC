import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ForecastCanvas from '../forecast-canvas';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';

// Import mocked hooks
const { useForecastNodes, useForecastEdges } = jest.requireMock('@/lib/store/forecast-graph-store');

// Mock React Flow with more realistic behavior
jest.mock('reactflow', () => {
  const React = require('react');
  
  // Global state for test utilities
  let globalSelectedNodes: any[] = [];
  let globalSelectedEdges: any[] = [];
  let globalOnSelectionChange: any = null;
  
  return {
    __esModule: true,
    default: React.forwardRef(({ 
      nodes, 
      edges, 
      onSelectionChange, 
      onNodesChange, 
      onEdgesChange,
      onConnect,
      onNodeDoubleClick,
      deleteKeyCode,
      nodeTypes,
      edgeTypes,
      fitView,
      selectNodesOnDrag,
      className,
      defaultEdgeOptions,
      connectionLineStyle,
      ...domProps 
    }: any, ref: any) => {
      const [selectedNodes, setSelectedNodes] = React.useState([]);
      const [selectedEdges, setSelectedEdges] = React.useState([]);
      
      // Store the callback for later use
      React.useEffect(() => {
        globalOnSelectionChange = onSelectionChange;
      }, [onSelectionChange]);
      
      // Sync local state with global state for testing
      React.useEffect(() => {
        setSelectedNodes(globalSelectedNodes);
        setSelectedEdges(globalSelectedEdges);
      }, []);
      
      // Simulate node selection
      const handleNodeClick = (nodeId: string) => {
        const node = nodes.find((n: any) => n.id === nodeId);
        if (node) {
          const newSelectedNodes: any[] = [node];
          const newSelectedEdges: any[] = [];
          
          setSelectedNodes(newSelectedNodes);
          setSelectedEdges(newSelectedEdges);
          
          globalSelectedNodes = newSelectedNodes;
          globalSelectedEdges = newSelectedEdges;
          
          onSelectionChange?.({ nodes: newSelectedNodes, edges: newSelectedEdges });
        }
      };
      
      // Simulate edge selection
      const handleEdgeClick = (edgeId: string) => {
        const edge = edges.find((e: any) => e.id === edgeId);
        if (edge) {
          const newSelectedNodes: any[] = [];
          const newSelectedEdges: any[] = [edge];
          
          setSelectedNodes(newSelectedNodes);
          setSelectedEdges(newSelectedEdges);
          
          globalSelectedNodes = newSelectedNodes;
          globalSelectedEdges = newSelectedEdges;
          
          onSelectionChange?.({ nodes: newSelectedNodes, edges: newSelectedEdges });
        }
      };
      
              return (
          <div 
            data-testid="react-flow" 
            data-delete-key-code={JSON.stringify(deleteKeyCode)}
            tabIndex={0}
            className={className}
            {...domProps}
          >
          {nodes.map((node: any) => (
            <div 
              key={node.id}
              data-testid={`node-${node.id}`}
              onClick={() => handleNodeClick(node.id)}
              style={{ 
                border: selectedNodes.some((n: any) => n.id === node.id) ? '2px solid blue' : '1px solid gray',
                padding: '10px',
                margin: '5px',
                cursor: 'pointer'
              }}
            >
              {node.type}: {node.data?.value || node.id}
            </div>
          ))}
          {edges.map((edge: any) => (
            <div 
              key={edge.id}
              data-testid={`edge-${edge.id}`}
              onClick={() => handleEdgeClick(edge.id)}
              style={{ 
                border: selectedEdges.some((e: any) => e.id === edge.id) ? '2px solid blue' : '1px solid gray',
                padding: '5px',
                margin: '2px',
                cursor: 'pointer'
              }}
            >
              Edge: {edge.source} → {edge.target}
            </div>
          ))}
        </div>
      );
    }),
    Controls: ({ children, showZoom, showFitView, showInteractive, className, ...domProps }: any) => 
      <div data-testid="controls" className={className} {...domProps}>{children}</div>,
    Background: ({ variant, gap, size, color, className, ...domProps }: any) => 
      <div data-testid="background" className={className} {...domProps} />,
    ReactFlowProvider: ({ children }: any) => <div data-testid="react-flow-provider">{children}</div>,
    BackgroundVariant: { Dots: 'dots' },
    useStoreApi: () => ({
      getState: () => ({ onError: jest.fn() })
    }),
    useKeyPress: jest.fn(() => false),
    // Export the global state for testing
    __testUtils: {
      getSelectedNodes: () => globalSelectedNodes,
      getSelectedEdges: () => globalSelectedEdges,
      clearSelection: () => {
        globalSelectedNodes = [];
        globalSelectedEdges = [];
      },
      triggerSelectionChange: () => {
        if (globalOnSelectionChange) {
          globalOnSelectionChange({ nodes: globalSelectedNodes, edges: globalSelectedEdges });
        }
      }
    }
  };
});

// Mock the store
const mockDeleteNode = jest.fn();
const mockDeleteEdge = jest.fn();
const mockOnNodesChange = jest.fn();
const mockOnEdgesChange = jest.fn();

jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
  useForecastNodes: jest.fn(),
  useForecastEdges: jest.fn(),
  useDeleteNode: () => mockDeleteNode,
  useDeleteEdge: () => mockDeleteEdge,
  useOpenConfigPanelForNode: () => jest.fn()
}));

// Mock node types
jest.mock('../node-types', () => ({
  nodeTypes: {},
  edgeTypes: {},
  defaultEdgeOptions: {},
  connectionLineStyle: {}
}));

describe('ForecastCanvas Integration Tests', () => {
  const mockStore = {
    nodes: [
      { id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } },
      { id: 'node-2', type: 'CONSTANT', data: { value: 20 }, position: { x: 100, y: 100 } }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' }
    ],
    onNodesChange: mockOnNodesChange,
    onEdgesChange: mockOnEdgesChange,
    addEdge: jest.fn(),
    setSelectedNodeId: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the individual hooks
    useForecastNodes.mockReturnValue(mockStore.nodes);
    useForecastEdges.mockReturnValue(mockStore.edges);
    
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => selector(mockStore));
    
    // Clear selection state before each test
    const { __testUtils } = require('reactflow');
    __testUtils.clearSelection();
  });

  it('should render nodes and edges correctly', () => {
    render(<ForecastCanvas />);
    
    expect(screen.getByTestId('node-node-1')).toBeInTheDocument();
    expect(screen.getByTestId('node-node-2')).toBeInTheDocument();
    expect(screen.getByTestId('edge-edge-1')).toBeInTheDocument();
  });

  it('should update visual styles when elements are clicked', async () => {
    const user = userEvent.setup();
    render(<ForecastCanvas />);
    
    const node1 = screen.getByTestId('node-node-1');
    const edge1 = screen.getByTestId('edge-edge-1');
    
    // Initially, elements should not be selected
    expect(node1).toHaveStyle('border: 1px solid gray');
    expect(edge1).toHaveStyle('border: 1px solid gray');
    
    // Click on node1 to select it
    await user.click(node1);
    
    // Node1 should now be selected (blue border)
    expect(node1).toHaveStyle('border: 2px solid blue');
    expect(edge1).toHaveStyle('border: 1px solid gray'); // edge should remain unselected
    
    // Click on edge1 to select it
    await user.click(edge1);
    
    // Edge1 should now be selected, node1 should be deselected
    expect(node1).toHaveStyle('border: 1px solid gray');
    expect(edge1).toHaveStyle('border: 2px solid blue');
  });

  it('should disable built-in React Flow delete functionality', () => {
    render(<ForecastCanvas />);
    
    const reactFlow = screen.getByTestId('react-flow');
    const deleteKeyCode = JSON.parse(reactFlow.getAttribute('data-delete-key-code') || '[]');
    expect(deleteKeyCode).toEqual([]);
  });

  it('should handle node selection and deletion workflow', async () => {
    const { useKeyPress, __testUtils } = require('reactflow');
    const user = userEvent.setup();
    
    // Initially no key is pressed
    useKeyPress.mockReturnValue(false);
    
    const { rerender } = render(<ForecastCanvas />);
    
    // Click on a node to select it
    const node1 = screen.getByTestId('node-node-1');
    await user.click(node1);
    
    // Verify the node is visually selected and in the selection state
    expect(node1).toHaveStyle('border: 2px solid blue');
    expect(__testUtils.getSelectedNodes()).toHaveLength(1);
    expect(__testUtils.getSelectedNodes()[0].id).toBe('node-1');
    
    // Now simulate delete key press and re-render to trigger useEffect
    useKeyPress.mockReturnValue(true);
    rerender(<ForecastCanvas />);
    
    // Wait for the deletion to be processed
    await waitFor(() => {
      expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
    });
  });

  it('should handle edge selection and deletion workflow', async () => {
    const { useKeyPress, __testUtils } = require('reactflow');
    const user = userEvent.setup();
    
    useKeyPress.mockReturnValue(false);
    
    const { rerender } = render(<ForecastCanvas />);
    
    // Click on an edge to select it
    const edge1 = screen.getByTestId('edge-edge-1');
    await user.click(edge1);
    
    // Verify the edge is visually selected and in the selection state
    expect(edge1).toHaveStyle('border: 2px solid blue');
    expect(__testUtils.getSelectedEdges()).toHaveLength(1);
    expect(__testUtils.getSelectedEdges()[0].id).toBe('edge-1');
    
    // Now simulate delete key press and re-render to trigger useEffect
    useKeyPress.mockReturnValue(true);
    rerender(<ForecastCanvas />);
    
    // Wait for the deletion to be processed
    await waitFor(() => {
      expect(mockDeleteEdge).toHaveBeenCalledWith('edge-1');
    });
  });

  it('should not delete anything when no elements are selected', () => {
    const { useKeyPress } = require('reactflow');
    
    // Simulate delete key press without any selection
    useKeyPress.mockReturnValue(true);
    
    render(<ForecastCanvas />);
    
    // Verify no delete functions were called
    expect(mockDeleteNode).not.toHaveBeenCalled();
    expect(mockDeleteEdge).not.toHaveBeenCalled();
  });

  it('should handle multiple selections correctly', async () => {
    const { useKeyPress, __testUtils } = require('reactflow');
    
    useKeyPress.mockReturnValue(false);
    
    // Mock multiple selections
    const multiSelectStore = {
      ...mockStore,
      nodes: [
        { id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } },
        { id: 'node-2', type: 'CONSTANT', data: { value: 20 }, position: { x: 100, y: 100 } },
        { id: 'node-3', type: 'OPERATOR', data: { operation: 'add' }, position: { x: 200, y: 200 } }
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-3' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' }
      ]
    };
    
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => selector(multiSelectStore));
    
    const { rerender } = render(<ForecastCanvas />);
    
    // Manually set multiple selected nodes (simulating multi-select)
    const selectedNodes = [
      { id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } },
      { id: 'node-2', type: 'CONSTANT', data: { value: 20 }, position: { x: 100, y: 100 } }
    ];
    
    // Simulate multiple selection by directly updating the global state and triggering selection change
    __testUtils.clearSelection();
    __testUtils.getSelectedNodes().push(...selectedNodes);
    __testUtils.triggerSelectionChange();
    
    // Simulate delete key press and re-render to trigger useEffect
    useKeyPress.mockReturnValue(true);
    rerender(<ForecastCanvas />);
    
    // Should handle the deletion of multiple nodes
    await waitFor(() => {
      expect(mockDeleteNode).toHaveBeenCalledTimes(2);
      expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
      expect(mockDeleteNode).toHaveBeenCalledWith('node-2');
    });
  });
}); 