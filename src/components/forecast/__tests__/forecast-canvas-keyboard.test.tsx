import React from 'react';
import { render, screen, act } from '@/test-utils';
import ForecastCanvas from '../forecast-canvas';

const mockDeleteNode = jest.fn();
const mockDeleteEdge = jest.fn();
const mockOnNodesChange = jest.fn();
const mockOnEdgesChange = jest.fn();
const mockAddEdge = jest.fn();
const mockSetSelectedNodeId = jest.fn();

const mockGraphState = {
  nodes: [
    { id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } },
    { id: 'node-2', type: 'CONSTANT', data: { value: 20 }, position: { x: 100, y: 100 } }
  ],
  edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
  forecastId: '',
  forecastName: '',
  forecastStartDate: '',
  forecastEndDate: '',
  organizationId: null as string | null,
  organizationForecasts: [] as unknown[],
  isDirty: false,
  lastEditedNodePosition: null as { x: number; y: number } | null,
  selectedNodeId: null as string | null,
  configPanelOpen: false,
  isLoading: false,
  error: null as string | null
};

jest.mock('@/lib/store/forecast-graph-store/hooks', () => ({
  useForecastGraph: jest.fn(),
  useForecastGraphActions: jest.fn()
}));

// Mock React Flow
jest.mock('reactflow', () => {
  const MockReactFlow = ({
    children,
    onSelectionChange,
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

    mockReact.useEffect(() => {
      if (onSelectionChange) {
        const mockNodes = [
          { id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } }
        ];
        const mockEdges = [{ id: 'edge-1', source: 'node-1', target: 'node-2' }];
        onSelectionChange({ nodes: mockNodes, edges: mockEdges });
      }
    }, [onSelectionChange]);

    return mockReact.createElement('div', {
      'data-testid': 'react-flow',
      'data-delete-key-code': JSON.stringify(deleteKeyCode || []),
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
    ReactFlowProvider: ({ children }: any) =>
      require('react').createElement('div', { 'data-testid': 'react-flow-provider' }, children),
    BackgroundVariant: { Dots: 'dots' },
    useStoreApi: () => ({
      getState: () => ({
        onError: jest.fn()
      })
    }),
    useKeyPress: jest.fn(() => false)
  };
});

jest.mock('../node-types', () => ({
  nodeTypes: {},
  edgeTypes: {},
  defaultEdgeOptions: {},
  connectionLineStyle: {}
}));

describe('ForecastCanvas Keyboard Functionality', () => {
  const { useForecastGraph, useForecastGraphActions } = jest.requireMock(
    '@/lib/store/forecast-graph-store/hooks'
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGraphState.configPanelOpen = false;

    useForecastGraph.mockImplementation(() => ({ ...mockGraphState }));
    useForecastGraphActions.mockImplementation(() => ({
      deleteNode: mockDeleteNode,
      deleteEdge: mockDeleteEdge,
      openConfigPanelForNode: jest.fn(),
      onNodesChange: mockOnNodesChange,
      onEdgesChange: mockOnEdgesChange,
      addEdge: mockAddEdge,
      setSelectedNodeId: mockSetSelectedNodeId
    }));
  });

  it('should render without crashing', () => {
    render(<ForecastCanvas />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('should have deleteKeyCode set to empty array to disable built-in deletion', () => {
    render(<ForecastCanvas />);
    const reactFlow = screen.getByTestId('react-flow');
    expect(reactFlow).toHaveAttribute('data-delete-key-code', '[]');
  });

  it('should call delete functions when delete key is pressed with selected elements', async () => {
    const { useKeyPress } = require('reactflow');
    useKeyPress.mockReturnValue(true);

    await act(async () => {
      render(<ForecastCanvas />);
    });

    expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
    expect(mockDeleteEdge).toHaveBeenCalledWith('edge-1');
  });

  it('should not delete when config panel is open', async () => {
    const { useKeyPress } = require('reactflow');
    useKeyPress.mockReturnValue(true);
    mockGraphState.configPanelOpen = true;
    useForecastGraph.mockImplementation(() => ({ ...mockGraphState }));

    await act(async () => {
      render(<ForecastCanvas />);
    });

    expect(mockDeleteNode).not.toHaveBeenCalled();
    expect(mockDeleteEdge).not.toHaveBeenCalled();
  });

  it('should not call delete functions when delete key is not pressed', () => {
    const { useKeyPress } = require('reactflow');
    useKeyPress.mockReturnValue(false);

    render(<ForecastCanvas />);

    expect(mockDeleteNode).not.toHaveBeenCalled();
    expect(mockDeleteEdge).not.toHaveBeenCalled();
  });

  it('should not cause infinite loops when selection changes', () => {
    const { useKeyPress } = require('reactflow');
    useKeyPress.mockReturnValue(false);

    const { rerender } = render(<ForecastCanvas />);
    rerender(<ForecastCanvas />);
    rerender(<ForecastCanvas />);

    expect(mockDeleteNode).not.toHaveBeenCalled();
    expect(mockDeleteEdge).not.toHaveBeenCalled();
  });
});
