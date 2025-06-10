import { render, screen } from '@/test-utils';
import SeedNode from '../nodes/SeedNode';
import '@testing-library/jest-dom';
import { NodeProps } from 'reactflow';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';

// Mock ReactFlow's Position enum and NodeProps
jest.mock('reactflow', () => ({
  Position: { Top: 'top', Bottom: 'bottom' },
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
}));

// Mock the forecast graph store
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
}));

// Create a helper function to create the minimum required props
const createNodeProps = (data: any) => ({
  id: 'test-id',
  type: 'seed',
  data,
  selected: false,
  zIndex: 1,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  dragHandle: '',
  dragging: false,
  targetPosition: 'top',
  sourcePosition: 'bottom'
} as NodeProps);

describe('SeedNode', () => {
  beforeEach(() => {
    // Reset the mock before each test
    jest.mocked(useForecastGraphStore).mockClear();
  });

  it('renders sourceMetricId and shows truncated version when no metric node found', () => {
    // Mock store with no nodes
    jest.mocked(useForecastGraphStore).mockReturnValue([]);

    const mockData = {
      sourceMetricId: 'metric-id-123'
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    
    // Should show truncated version since no metric node exists
    expect(screen.getByText('metric-i...')).toBeInTheDocument();
    
    // Full ID should be in title attribute
    const metricDiv = screen.getByTitle('metric-id-123');
    expect(metricDiv).toBeInTheDocument();
  });

  it('renders metric label when metric node is found in store', () => {
    // Mock store with a metric node
    const mockNodes = [
      {
        id: 'metric-id-123',
        type: 'METRIC',
        data: { label: 'Test Metric Label' }
      }
    ];
    jest.mocked(useForecastGraphStore).mockReturnValue(mockNodes);

    const mockData = {
      sourceMetricId: 'metric-id-123'
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    
    // Should show the metric's label instead of the truncated ID
    expect(screen.getByText('Test Metric Label')).toBeInTheDocument();
    
    // Full ID should still be in title attribute
    const metricDiv = screen.getByTitle('metric-id-123');
    expect(metricDiv).toBeInTheDocument();
  });

  it('renders default values when data is missing', () => {
    jest.mocked(useForecastGraphStore).mockReturnValue([]);

    render(<SeedNode {...createNodeProps({})} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Default for sourceMetricId
    
    // Should have default title as well
    const metricDiv = screen.getByTitle('-');
    expect(metricDiv).toBeInTheDocument();
  });

  it('renders source and target handles', () => {
    jest.mocked(useForecastGraphStore).mockReturnValue([]);

    render(<SeedNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });

  it('handles metric node without label gracefully', () => {
    // Mock store with a metric node that has no label
    const mockNodes = [
      {
        id: 'metric-id-123',
        type: 'METRIC',
        data: {} // No label
      }
    ];
    jest.mocked(useForecastGraphStore).mockReturnValue(mockNodes);

    const mockData = {
      sourceMetricId: 'metric-id-123'
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    
    // Should show fallback format "Metric {first8chars}..."
    expect(screen.getByText('Metric metric-i...')).toBeInTheDocument();
  });
}); 