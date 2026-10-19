import { render } from '@/test-utils';
import ForecastCanvas from '../forecast-canvas';
import { validateForecastGraph } from '@/lib/services/forecast-calculation/graph-validation';

/** Props ForecastCanvas last passed to <ReactFlow>. */
let mockFlowProps: Record<string, any> = {};
/** State the React Flow store reports to onConnectEnd. */
let mockFlowState: Record<string, unknown> = {};

jest.mock('reactflow', () => ({
  __esModule: true,
  default: (props: Record<string, any>) => {
    mockFlowProps = props;
    return null;
  },
  Controls: () => null,
  Background: () => null,
  ReactFlowProvider: ({ children }: any) => children,
  useStoreApi: () => ({ getState: () => mockFlowState }),
  useKeyPress: () => false,
  BackgroundVariant: { Dots: 'dots' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
}));

jest.mock('../node-types', () => ({
  nodeTypes: {},
  edgeTypes: {},
  defaultEdgeOptions: { style: { strokeWidth: 2, stroke: '#94a3b8' } },
  connectionLineStyle: {},
}));

const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/store/forecast-graph-store/hooks', () => ({
  useForecastGraph: jest.fn(),
  useForecastGraphActions: jest.fn(),
  useCalculations: jest.fn(),
}));

const { useForecastGraph, useForecastGraphActions, useCalculations } = jest.requireMock(
  '@/lib/store/forecast-graph-store/hooks'
) as { useForecastGraph: jest.Mock; useForecastGraphActions: jest.Mock; useCalculations: jest.Mock };

const node = (id: string, type: string, data: Record<string, unknown>) => ({ id, type, data, position: { x: 0, y: 0 } });
const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });

// c -> a -> b -> m: drawing m -> a would close a same-month cycle.
const nodes = [
  node('m', 'METRIC', { label: 'Revenue' }),
  node('c', 'CONSTANT', { name: 'one', value: 1 }),
  node('x', 'CONSTANT', { name: 'two', value: 2 }),
  node('a', 'OPERATOR', { op: '+', inputOrder: ['c'] }),
  node('b', 'OPERATOR', { op: '+', inputOrder: ['a'] }),
];
const edges = [edge('c', 'a'), edge('a', 'b'), edge('b', 'm')];

const connection = (source: string, target: string) => ({ source, target, sourceHandle: null, targetHandle: null });

function renderCanvas(graph: { nodes: unknown[]; edges: unknown[] }, graphValidation: unknown = null) {
  useForecastGraph.mockReturnValue({ ...graph, configPanelOpen: false });
  useCalculations.mockReturnValue({ graphValidation });
  return render(<ForecastCanvas />);
}

describe('ForecastCanvas connection validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFlowProps = {};
    mockFlowState = {};
    useForecastGraphActions.mockReturnValue({
      deleteNode: jest.fn(),
      deleteEdge: jest.fn(),
      openConfigPanelForNode: jest.fn(),
      onNodesChange: jest.fn(),
      onEdgesChange: jest.fn(),
      addEdge: jest.fn(),
      setSelectedNodeId: jest.fn(),
    });
  });

  it('refuses a connection that would close a cycle', () => {
    renderCanvas({ nodes, edges });

    expect(mockFlowProps.isValidConnection(connection('m', 'a'))).toBe(false);
  });

  it('accepts a connection the engine has no errors for', () => {
    renderCanvas({ nodes, edges });

    expect(mockFlowProps.isValidConnection(connection('x', 'a'))).toBe(true);
  });

  it('refuses an incomplete connection', () => {
    renderCanvas({ nodes, edges });

    expect(mockFlowProps.isValidConnection({ source: 'x', target: null, sourceHandle: null, targetHandle: null })).toBe(false);
  });

  it('toasts the first error when a refused connection is dropped on a handle', () => {
    renderCanvas({ nodes, edges });
    mockFlowState = {
      connectionStatus: 'invalid',
      connectionStartHandle: { nodeId: 'm', handleId: null, type: 'source' },
      connectionEndHandle: { nodeId: 'a', handleId: null, type: 'target' },
    };

    mockFlowProps.onConnectEnd(new MouseEvent('mouseup'));

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Connection not allowed',
        description: expect.stringMatching(/Circular dependency within the same month/),
        variant: 'destructive',
      })
    );
  });

  it('reads the edge direction when the drag starts at a target handle', () => {
    renderCanvas({ nodes, edges });
    mockFlowState = {
      connectionStatus: 'invalid',
      connectionStartHandle: { nodeId: 'a', handleId: null, type: 'target' },
      connectionEndHandle: { nodeId: 'm', handleId: null, type: 'source' },
    };

    mockFlowProps.onConnectEnd(new MouseEvent('mouseup'));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringMatching(/Circular dependency/) })
    );
  });

  it('does not toast when the drop was valid or not on a handle', () => {
    renderCanvas({ nodes, edges });

    mockFlowState = { connectionStatus: 'valid', connectionStartHandle: { nodeId: 'x', type: 'source' }, connectionEndHandle: { nodeId: 'a', type: 'target' } };
    mockFlowProps.onConnectEnd(new MouseEvent('mouseup'));
    mockFlowState = { connectionStatus: null, connectionStartHandle: { nodeId: 'm', type: 'source' }, connectionEndHandle: null };
    mockFlowProps.onConnectEnd(new MouseEvent('mouseup'));

    expect(mockToast).not.toHaveBeenCalled();
  });
});

describe('ForecastCanvas loop highlighting', () => {
  const cyclic = [...edges, edge('m', 'a')];

  beforeEach(() => {
    mockFlowProps = {};
    useForecastGraphActions.mockReturnValue({
      deleteNode: jest.fn(),
      deleteEdge: jest.fn(),
      openConfigPanelForNode: jest.fn(),
      onNodesChange: jest.fn(),
      onEdgesChange: jest.fn(),
      addEdge: jest.fn(),
      setSelectedNodeId: jest.fn(),
    });
  });

  it('marks the nodes and edges of a reported cycle', () => {
    renderCanvas({ nodes, edges: cyclic }, validateForecastGraph(nodes, cyclic));

    const flagged = (items: Array<{ id: string; className?: string }>, cls: string) =>
      items.filter((item) => (item.className ?? '').split(' ').indexOf(cls) >= 0).map((item) => item.id).sort();

    expect(flagged(mockFlowProps.nodes, 'forecast-node-loop')).toEqual(['a', 'b', 'm']);
    expect(flagged(mockFlowProps.edges, 'forecast-edge-loop')).toEqual(['a-b', 'b-m', 'm-a']);
    expect(mockFlowProps.edges.find((e: { id: string }) => e.id === 'm-a').style).toEqual({ strokeWidth: 2, stroke: '#ef4444' });
  });

  it('passes the store nodes and edges through unchanged without loop issues', () => {
    renderCanvas({ nodes, edges }, validateForecastGraph(nodes, edges));

    expect(mockFlowProps.nodes).toBe(nodes);
    expect(mockFlowProps.edges).toBe(edges);
  });
});
