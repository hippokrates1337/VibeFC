import { render, screen } from '@/test-utils';
import RankedEdge from '../edges/RankedEdge';
import '@testing-library/jest-dom';
import { EdgeProps } from 'reactflow';
import { useForecastNodes } from '@/lib/store/forecast-graph-store';

// Mock the forecast store
jest.mock('@/lib/store/forecast-graph-store');
const mockUseForecastNodes = useForecastNodes as jest.MockedFunction<typeof useForecastNodes>;

// Mock ReactFlow's getBezierPath and EdgeLabelRenderer
jest.mock('reactflow', () => ({
  getBezierPath: jest.fn(() => ['M 0 0 L 100 100', 50, 50, 0, 0]),
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div data-testid="edge-label-renderer">{children}</div>,
}));

// Create a helper function to create the minimum required EdgeProps
const createEdgeProps = (overrides: Partial<EdgeProps> = {}): EdgeProps => ({
  id: 'test-edge',
  source: 'source-node',
  target: 'target-node',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: 'bottom' as any,
  targetPosition: 'top' as any,
  selected: false,
  ...overrides,
});

// Create a helper function to render RankedEdge in proper SVG context
const renderRankedEdge = (props: EdgeProps) => {
  return render(
    <svg>
      <RankedEdge {...props} />
    </svg>
  );
};

describe('RankedEdge', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('renders basic edge without rank marker for non-operator targets', () => {
    // Mock nodes with a non-operator target
    mockUseForecastNodes.mockReturnValue([
      { id: 'source-node', type: 'DATA', data: { name: 'Source', variableId: 'var1', offsetMonths: 0 }, position: { x: 0, y: 0 } },
      { id: 'target-node', type: 'CONSTANT', data: { value: 10 }, position: { x: 100, y: 100 } },
    ]);

    renderRankedEdge(createEdgeProps());

    // Should render the edge path but no rank marker
    expect(document.querySelector('path.react-flow__edge-path')).toBeInTheDocument();
    expect(screen.queryByTestId('edge-label-renderer')).not.toBeInTheDocument();
  });

  it('renders rank marker for operator target with inputOrder', () => {
    // Mock nodes with an operator target that has inputOrder
    mockUseForecastNodes.mockReturnValue([
      { id: 'source-node', type: 'DATA', data: { name: 'Source', variableId: 'var1', offsetMonths: 0 }, position: { x: 0, y: 0 } },
      { 
        id: 'target-node', 
        type: 'OPERATOR', 
        data: { 
          op: '+', 
          inputOrder: ['other-source', 'source-node', 'another-source'] 
        }, 
        position: { x: 100, y: 100 } 
      },
    ]);

    renderRankedEdge(createEdgeProps());

    // Should render the edge path and rank marker
    expect(document.querySelector('path.react-flow__edge-path')).toBeInTheDocument();
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // source-node is at index 1, so rank 2
  });

  it('renders rank marker with correct rank for first input', () => {
    // Mock nodes with an operator target where source is first in inputOrder
    mockUseForecastNodes.mockReturnValue([
      { id: 'source-node', type: 'DATA', data: { name: 'Source', variableId: 'var1', offsetMonths: 0 }, position: { x: 0, y: 0 } },
      { 
        id: 'target-node', 
        type: 'OPERATOR', 
        data: { 
          op: '*', 
          inputOrder: ['source-node', 'other-source'] 
        }, 
        position: { x: 100, y: 100 } 
      },
    ]);

    renderRankedEdge(createEdgeProps());

    // Should render rank 1 (first input)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not render rank marker when source not in inputOrder', () => {
    // Mock nodes with an operator target but source not in inputOrder
    mockUseForecastNodes.mockReturnValue([
      { id: 'source-node', type: 'DATA', data: { name: 'Source', variableId: 'var1', offsetMonths: 0 }, position: { x: 0, y: 0 } },
      { 
        id: 'target-node', 
        type: 'OPERATOR', 
        data: { 
          op: '-', 
          inputOrder: ['other-source', 'another-source'] 
        }, 
        position: { x: 100, y: 100 } 
      },
    ]);

    renderRankedEdge(createEdgeProps());

    // Should render the edge path but no rank marker
    expect(document.querySelector('path.react-flow__edge-path')).toBeInTheDocument();
    expect(screen.queryByTestId('edge-label-renderer')).not.toBeInTheDocument();
  });

  it('applies selected styling when edge is selected', () => {
    // Mock nodes with an operator target
    mockUseForecastNodes.mockReturnValue([
      { id: 'source-node', type: 'DATA', data: { name: 'Source', variableId: 'var1', offsetMonths: 0 }, position: { x: 0, y: 0 } },
      { 
        id: 'target-node', 
        type: 'OPERATOR', 
        data: { 
          op: '+', 
          inputOrder: ['source-node'] 
        }, 
        position: { x: 100, y: 100 } 
      },
    ]);

    renderRankedEdge(createEdgeProps({ selected: true }));

    // Should render with selected styling
    expect(screen.getByText('1')).toBeInTheDocument();
    // The rank marker should have selected styling (blue background)
    const rankMarker = screen.getByText('1');
    expect(rankMarker).toHaveClass('bg-blue-600');
    expect(rankMarker).toHaveClass('border-blue-200');
  });

  it('handles operator target with empty inputOrder', () => {
    // Mock nodes with an operator target but empty inputOrder
    mockUseForecastNodes.mockReturnValue([
      { id: 'source-node', type: 'DATA', data: { name: 'Source', variableId: 'var1', offsetMonths: 0 }, position: { x: 0, y: 0 } },
      { 
        id: 'target-node', 
        type: 'OPERATOR', 
        data: { 
          op: '/', 
          inputOrder: [] 
        }, 
        position: { x: 100, y: 100 } 
      },
    ]);

    renderRankedEdge(createEdgeProps());

    // Should render the edge path but no rank marker
    expect(document.querySelector('path.react-flow__edge-path')).toBeInTheDocument();
    expect(screen.queryByTestId('edge-label-renderer')).not.toBeInTheDocument();
  });
}); 