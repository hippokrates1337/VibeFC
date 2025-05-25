import { render, screen } from '@testing-library/react';
import ForecastCanvas from '../forecast-canvas';
import '@testing-library/jest-dom';

// Mock the React Flow library
jest.mock('reactflow', () => {
  const ReactFlowMock = ({ nodes, edges, onNodesChange, onEdgesChange, onConnect, nodeTypes, children }: any) => (
    <div data-testid="react-flow-mock">
      <div data-testid="nodes-count">{nodes.length}</div>
      <div data-testid="edges-count">{edges.length}</div>
      <button 
        data-testid="trigger-nodes-change" 
        onClick={() => onNodesChange && onNodesChange([{ id: 'test-node', type: 'add' }])}
      >
        Trigger Nodes Change
      </button>
      <button 
        data-testid="trigger-edges-change" 
        onClick={() => onEdgesChange && onEdgesChange([{ id: 'test-edge', type: 'add' }])}
      >
        Trigger Edges Change
      </button>
      <button 
        data-testid="trigger-connect" 
        onClick={() => onConnect && onConnect({ source: 'node1', target: 'node2' })}
      >
        Trigger Connect
      </button>
      <div data-testid="node-types">{Object.keys(nodeTypes || {}).join(',')}</div>
      <div>{children}</div>
    </div>
  );

  return {
    __esModule: true,
    default: ReactFlowMock,
    Controls: () => <div data-testid="react-flow-controls">Controls</div>,
    Background: () => <div data-testid="react-flow-background">Background</div>,
    ReactFlowProvider: ({ children }: any) => <div data-testid="react-flow-provider">{children}</div>,
    BackgroundVariant: { Dots: 'dots' },
    MarkerType: { ArrowClosed: 'arrowclosed' }
  };
});

// Mock Zustand store
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn()
}));

// Import after mocking
const { useForecastGraphStore } = jest.requireMock('@/lib/store/forecast-graph-store');

describe('ForecastCanvas', () => {
  beforeEach(() => {
    // Setup default mock implementation
    useForecastGraphStore.mockImplementation((selector: any) => 
      selector({
        nodes: [{ id: 'node1' }, { id: 'node2' }],
        edges: [{ id: 'edge1', source: 'node1', target: 'node2' }],
        onNodesChange: jest.fn(),
        onEdgesChange: jest.fn(),
        addEdge: jest.fn(),
        setSelectedNodeId: jest.fn(),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes store nodes and edges to ReactFlow', () => {
    render(<ForecastCanvas />);
    
    expect(screen.getByTestId('nodes-count')).toHaveTextContent('2');
    expect(screen.getByTestId('edges-count')).toHaveTextContent('1');
  });

  it('registers all node types with ReactFlow', () => {
    render(<ForecastCanvas />);
    
    const nodeTypes = screen.getByTestId('node-types').textContent;
    expect(nodeTypes).toContain('DATA');
    expect(nodeTypes).toContain('CONSTANT');
    expect(nodeTypes).toContain('OPERATOR');
    expect(nodeTypes).toContain('METRIC');
    expect(nodeTypes).toContain('SEED');
  });

  it('renders ReactFlow with controls and background', () => {
    render(<ForecastCanvas />);
    
    expect(screen.getByTestId('react-flow-controls')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow-background')).toBeInTheDocument();
  });

  it('calls store onNodesChange when nodes change', () => {
    const mockOnNodesChange = jest.fn();
    useForecastGraphStore.mockImplementation((selector: any) => 
      selector({
        nodes: [],
        edges: [],
        onNodesChange: mockOnNodesChange,
        onEdgesChange: jest.fn(),
        addEdge: jest.fn(),
        setSelectedNodeId: jest.fn(),
      })
    );

    render(<ForecastCanvas />);
    screen.getByTestId('trigger-nodes-change').click();
    
    expect(mockOnNodesChange).toHaveBeenCalledWith([{ id: 'test-node', type: 'add' }]);
  });

  it('calls store onEdgesChange when edges change', () => {
    const mockOnEdgesChange = jest.fn();
    useForecastGraphStore.mockImplementation((selector: any) => 
      selector({
        nodes: [],
        edges: [],
        onNodesChange: jest.fn(),
        onEdgesChange: mockOnEdgesChange,
        addEdge: jest.fn(),
        setSelectedNodeId: jest.fn(),
      })
    );

    render(<ForecastCanvas />);
    screen.getByTestId('trigger-edges-change').click();
    
    expect(mockOnEdgesChange).toHaveBeenCalledWith([{ id: 'test-edge', type: 'add' }]);
  });

  it('calls store addEdge when connection is made', () => {
    const mockAddEdge = jest.fn();
    useForecastGraphStore.mockImplementation((selector: any) => 
      selector({
        nodes: [],
        edges: [],
        onNodesChange: jest.fn(),
        onEdgesChange: jest.fn(),
        addEdge: mockAddEdge,
        setSelectedNodeId: jest.fn(),
      })
    );

    render(<ForecastCanvas />);
    screen.getByTestId('trigger-connect').click();
    
    expect(mockAddEdge).toHaveBeenCalledWith({ source: 'node1', target: 'node2' });
  });
}); 