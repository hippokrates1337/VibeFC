import React from 'react';
import { render } from '@/test-utils';
import ForecastCanvas from '../forecast-canvas';

// Mock React Flow with minimal implementation
jest.mock('reactflow', () => {
  // Create a mock component that will be used in the factory
  const MockReactFlow = ({ 
    onSelectionChange, 
    // Filter out React Flow specific props
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
    
    // Simulate selection changes that previously caused infinite loops
    mockReact.useEffect(() => {
      if (onSelectionChange) {
        // Simulate multiple selection changes
        onSelectionChange({ nodes: [], edges: [] });
        onSelectionChange({ 
          nodes: [{ id: 'test-node', type: 'CONSTANT', data: {}, position: { x: 0, y: 0 } }], 
          edges: [] 
        });
        onSelectionChange({ 
          nodes: [], 
          edges: [{ id: 'test-edge', source: 'a', target: 'b' }] 
        });
      }
    }, [onSelectionChange]);
    
    return mockReact.createElement('div', { 
      'data-testid': 'react-flow', 
      className,
      ...domProps 
    });
  };

  return {
    __esModule: true,
    default: MockReactFlow,
    Controls: ({ showZoom, showFitView, showInteractive, className, ...domProps }: any) => 
      require('react').createElement('div', { 
        'data-testid': 'controls', 
        className,
        ...domProps 
      }),
    Background: ({ variant, gap, size, color, className, ...domProps }: any) => 
      require('react').createElement('div', { 
        'data-testid': 'background', 
        className,
        ...domProps 
      }),
    ReactFlowProvider: ({ children }: any) => require('react').createElement('div', {}, children),
    BackgroundVariant: { Dots: 'dots' },
    useStoreApi: () => ({ getState: () => ({ onError: jest.fn() }) }),
    useKeyPress: jest.fn(() => false)
  };
});

// Mock store with minimal implementation
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn((selector) => selector({
    nodes: [],
    edges: [],
    onNodesChange: jest.fn(),
    onEdgesChange: jest.fn(),
    addEdge: jest.fn(),
    setSelectedNodeId: jest.fn()
  })),
  useForecastNodes: jest.fn(() => []),
  useForecastEdges: jest.fn(() => []),
  useDeleteNode: () => jest.fn(),
  useDeleteEdge: () => jest.fn(),
  useOpenConfigPanelForNode: () => jest.fn()
}));

// Mock node types
jest.mock('../node-types', () => ({
  nodeTypes: {},
  edgeTypes: {},
  defaultEdgeOptions: {},
  connectionLineStyle: {}
}));

describe('ForecastCanvas Stability', () => {
  // Increase timeout for this test to catch infinite loops
  jest.setTimeout(10000);

  it('should not cause infinite loops with selection changes', () => {
    // Mock console.error to catch React warnings about infinite loops
    const originalError = console.error;
    const mockError = jest.fn();
    console.error = mockError;

    try {
      // This should complete without hanging or throwing errors
      const { unmount } = render(<ForecastCanvas />);
      
      // Wait a bit to ensure no delayed effects cause issues
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Check that no "Maximum update depth exceeded" errors occurred
          const infiniteLoopErrors = mockError.mock.calls.filter(call => 
            call.some((arg: any) => 
              typeof arg === 'string' && arg.includes('Maximum update depth exceeded')
            )
          );
          
          expect(infiniteLoopErrors).toHaveLength(0);
          
          unmount();
          resolve();
        }, 1000);
      });
    } finally {
      console.error = originalError;
    }
  });

  it('should handle rapid selection changes without issues', () => {
    const { rerender } = render(<ForecastCanvas />);
    
    // Rapidly re-render the component multiple times
    for (let i = 0; i < 10; i++) {
      rerender(<ForecastCanvas />);
    }
    
    // If we get here without hanging, the test passes
    expect(true).toBe(true);
  });
}); 