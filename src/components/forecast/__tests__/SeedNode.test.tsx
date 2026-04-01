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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Flame: ({ className }: { className?: string }) => (
    <div data-testid="flame-icon" className={className}>🔥</div>
  ),
}));

// Mock NodeValueOverlay component
jest.mock('../node-value-overlay', () => {
  return function MockNodeValueOverlay({ nodeId, value, nodeType, position, compact }: any) {
    return (
      <div data-testid="node-value-overlay" data-node-id={nodeId} data-value={value} data-node-type={nodeType} data-position={position} data-compact={compact}>
        Value: {value?.value || 'N/A'}
      </div>
    );
  };
});

// Mock the forecast graph store with all required hooks
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
  useSelectedVisualizationMonth: jest.fn(),
  useShowVisualizationSlider: jest.fn(), 
  useGetNodeValueForMonth: jest.fn(),
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
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Import the mocked modules
    const { useForecastGraphStore, useSelectedVisualizationMonth, useShowVisualizationSlider, useGetNodeValueForMonth } = require('@/lib/store/forecast-graph-store');
    
    // Mock the main store hook (this will be overridden in individual tests)
    (useForecastGraphStore as jest.Mock).mockReturnValue([]);
    
    // Mock visualization hooks with default values
    (useSelectedVisualizationMonth as jest.Mock).mockReturnValue(null);
    (useShowVisualizationSlider as jest.Mock).mockReturnValue(false);
    (useGetNodeValueForMonth as jest.Mock).mockReturnValue(jest.fn(() => null));
  });

  it('renders sourceMetricId and shows truncated version when no metric node found', () => {
    // Import the mocked modules
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    
    // Mock store with no nodes
    (useForecastGraphStore as jest.Mock).mockReturnValue([]);

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
    // Import the mocked modules
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    
    // Mock store with a metric node
    const mockNodes = [
      {
        id: 'metric-id-123',
        type: 'METRIC',
        data: { label: 'Test Metric Label' }
      }
    ];
    (useForecastGraphStore as jest.Mock).mockReturnValue(mockNodes);

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
    // Import the mocked modules
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    
    (useForecastGraphStore as jest.Mock).mockReturnValue([]);

    render(<SeedNode {...createNodeProps({})} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Default for sourceMetricId
    
    // Should have default title as well
    const metricDiv = screen.getByTitle('-');
    expect(metricDiv).toBeInTheDocument();
  });

  it('renders source and target handles', () => {
    // Import the mocked modules
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    
    (useForecastGraphStore as jest.Mock).mockReturnValue([]);

    render(<SeedNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });

  it('handles metric node without label gracefully', () => {
    // Import the mocked modules
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    
    // Mock store with a metric node that has no label
    const mockNodes = [
      {
        id: 'metric-id-123',
        type: 'METRIC',
        data: {} // No label
      }
    ];
    (useForecastGraphStore as jest.Mock).mockReturnValue(mockNodes);

    const mockData = {
      sourceMetricId: 'metric-id-123'
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    
    // Should show fallback format "Metric {first8chars}..."
    expect(screen.getByText('Metric metric-i...')).toBeInTheDocument();
  });

  it('shows visualization overlay when slider is enabled and has value', () => {
    // Import the mocked modules
    const { useForecastGraphStore, useSelectedVisualizationMonth, useShowVisualizationSlider, useGetNodeValueForMonth } = require('@/lib/store/forecast-graph-store');
    
    // Mock store and visualization state
    (useForecastGraphStore as jest.Mock).mockReturnValue([]);
    (useSelectedVisualizationMonth as jest.Mock).mockReturnValue(new Date('2025-01-01'));
    (useShowVisualizationSlider as jest.Mock).mockReturnValue(true);
    
    const mockNodeValue = { value: 1000, nodeId: 'test-id', nodeType: 'SEED' };
    const mockGetNodeValue = jest.fn(() => mockNodeValue);
    (useGetNodeValueForMonth as jest.Mock).mockReturnValue(mockGetNodeValue);

    const mockData = {
      sourceMetricId: 'metric-id-123'
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    
    // Should show the overlay
    const overlay = screen.getByTestId('node-value-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('data-node-id', 'test-id');
    expect(overlay).toHaveAttribute('data-node-type', 'SEED');
    expect(overlay).toHaveAttribute('data-position', 'bottom-right');
    expect(overlay).toHaveAttribute('data-compact', 'true');
  });

  it('does not show visualization overlay when slider is disabled', () => {
    // Import the mocked modules
    const { useForecastGraphStore, useSelectedVisualizationMonth, useShowVisualizationSlider, useGetNodeValueForMonth } = require('@/lib/store/forecast-graph-store');
    
    // Mock store and visualization state (slider disabled)
    (useForecastGraphStore as jest.Mock).mockReturnValue([]);
    (useSelectedVisualizationMonth as jest.Mock).mockReturnValue(new Date('2025-01-01'));
    (useShowVisualizationSlider as jest.Mock).mockReturnValue(false); // Disabled
    (useGetNodeValueForMonth as jest.Mock).mockReturnValue(jest.fn(() => null));

    const mockData = {
      sourceMetricId: 'metric-id-123'
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    
    // Should not show the overlay
    const overlay = screen.queryByTestId('node-value-overlay');
    expect(overlay).not.toBeInTheDocument();
  });
}); 