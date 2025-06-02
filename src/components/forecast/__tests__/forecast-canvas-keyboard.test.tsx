import React from 'react';
import { render, screen, fireEvent, act } from '@/test-utils';
import ForecastCanvas from '../forecast-canvas';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';

// Import mocked hooks
const { useForecastNodes, useForecastEdges } = jest.requireMock('@/lib/store/forecast-graph-store');

// Mock React Flow
jest.mock('reactflow', () => {
  // Create a mock component that will be used in the factory
  const MockReactFlow = ({ 
    children, 
    onSelectionChange, 
    // Filter out React Flow specific props to avoid DOM warnings
    nodes,
    edges,
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
  }: any) => {
    const mockReact = require('react');
    
    // Simulate React Flow component
    mockReact.useEffect(() => {
      // Simulate selection change for testing
      if (onSelectionChange) {
        const mockNodes = [{ id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } }];
        const mockEdges = [{ id: 'edge-1', source: 'node-1', target: 'node-2' }];
        onSelectionChange({ nodes: mockNodes, edges: mockEdges });
      }
    }, [onSelectionChange]);
    
    return mockReact.createElement('div', { 
      'data-testid': 'react-flow',
      'data-delete-key-code': JSON.stringify(deleteKeyCode || []), // Use data attribute to avoid React warning
      className,
      ...domProps 
    }, children);
  };

  return {
    __esModule: true,
    default: MockReactFlow,
    Controls: ({ children, showZoom, showFitView, showInteractive, className, ...domProps }: any) => 
      require('react').createElement('div', { 
        'data-testid': 'controls', 
        className,
        ...domProps 
      }, children),
    Background: ({ variant, gap, size, color, className, ...domProps }: any) => 
      require('react').createElement('div', { 
        'data-testid': 'background', 
        className,
        ...domProps 
      }),
    ReactFlowProvider: ({ children }: any) => require('react').createElement('div', { 'data-testid': 'react-flow-provider' }, children),
    BackgroundVariant: { Dots: 'dots' },
    useStoreApi: () => ({
      getState: () => ({
        onError: jest.fn()
      })
    }),
    useKeyPress: jest.fn(() => false)
  };
});

// Mock the store
const mockDeleteNode = jest.fn();
const mockDeleteEdge = jest.fn();

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

describe('ForecastCanvas Keyboard Functionality', () => {
  const mockStore = {
    nodes: [
      { id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } },
      { id: 'node-2', type: 'CONSTANT', data: { value: 20 }, position: { x: 100, y: 100 } }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' }
    ],
    onNodesChange: jest.fn(),
    onEdgesChange: jest.fn(),
    addEdge: jest.fn(),
    setSelectedNodeId: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the individual hooks
    useForecastNodes.mockReturnValue(mockStore.nodes);
    useForecastEdges.mockReturnValue(mockStore.edges);
    
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => selector(mockStore));
  });

  it('should render without crashing', () => {
    render(<ForecastCanvas />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('should have deleteKeyCode set to empty array to disable built-in deletion', () => {
    render(<ForecastCanvas />);
    const reactFlow = screen.getByTestId('react-flow');
    expect(reactFlow).toHaveAttribute('data-delete-key-code', '[]'); // Should be JSON stringified empty array
  });

  it('should call delete functions when delete key is pressed with selected elements', async () => {
    const { useKeyPress } = require('reactflow');
    
    // Mock useKeyPress to return true (simulating delete key press)
    useKeyPress.mockReturnValue(true);
    
    await act(async () => {
      render(<ForecastCanvas />);
    });

    // The component should call delete functions for selected elements
    // Note: The actual deletion would happen through the selection change effect and refs
    expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
    expect(mockDeleteEdge).toHaveBeenCalledWith('edge-1');
  });

  it('should not call delete functions when delete key is not pressed', () => {
    const { useKeyPress } = require('reactflow');
    
    // Mock useKeyPress to return false (no key press)
    useKeyPress.mockReturnValue(false);
    
    render(<ForecastCanvas />);

    expect(mockDeleteNode).not.toHaveBeenCalled();
    expect(mockDeleteEdge).not.toHaveBeenCalled();
  });

  it('should not cause infinite loops when selection changes', () => {
    const { useKeyPress } = require('reactflow');
    
    // Mock useKeyPress to return false (no key press)
    useKeyPress.mockReturnValue(false);
    
    // This should not cause any infinite loops or excessive re-renders
    const { rerender } = render(<ForecastCanvas />);
    
    // Re-render multiple times to ensure stability
    rerender(<ForecastCanvas />);
    rerender(<ForecastCanvas />);
    
    // Should not have called delete functions
    expect(mockDeleteNode).not.toHaveBeenCalled();
    expect(mockDeleteEdge).not.toHaveBeenCalled();
  });
}); 