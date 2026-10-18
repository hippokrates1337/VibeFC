import { render, screen } from '@/test-utils';
import SeedNode from '../nodes/SeedNode';
import '@testing-library/jest-dom';
import { NodeProps } from 'reactflow';

jest.mock('reactflow', () => ({
  Position: { Top: 'top', Bottom: 'bottom' },
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
}));

jest.mock('lucide-react', () => ({
  Flame: ({ className }: { className?: string }) => (
    <div data-testid="flame-icon" className={className}>🔥</div>
  ),
}));

jest.mock('../node-value-overlay', () => {
  return function MockNodeValueOverlay({ nodeId, value, nodeType, position, compact }: any) {
    return (
      <div
        data-testid="node-value-overlay"
        data-node-id={nodeId}
        data-value={value}
        data-node-type={nodeType}
        data-position={position}
        data-compact={compact}
      >
        Value: {value?.value || 'N/A'}
      </div>
    );
  };
});

jest.mock('@/lib/store/forecast-graph-store/hooks', () => ({
  useForecastGraph: jest.fn(),
  useVisualization: jest.fn(),
  useNodeVisualizationValue: jest.fn(),
}));

const { useForecastGraph, useVisualization, useNodeVisualizationValue } = jest.requireMock(
  '@/lib/store/forecast-graph-store/hooks'
) as {
  useForecastGraph: jest.Mock;
  useVisualization: jest.Mock;
  useNodeVisualizationValue: jest.Mock;
};

const defaultVisualization = () => ({
  selectedVisualizationMonth: null as Date | null,
  showVisualizationSlider: false,
  forecastStartDate: '',
  forecastEndDate: '',
});

const createNodeProps = (data: any) =>
  ({
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
    sourcePosition: 'bottom',
  }) as NodeProps;

describe('SeedNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useForecastGraph.mockReturnValue({ nodes: [] });
    useVisualization.mockReturnValue(defaultVisualization());
    useNodeVisualizationValue.mockReturnValue(null);
  });

  it('renders sourceMetricId and shows truncated version when no metric node found', () => {
    useForecastGraph.mockReturnValue({ nodes: [] });

    const mockData = {
      sourceMetricId: 'metric-id-123',
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('metric-i...')).toBeInTheDocument();
    const metricDiv = screen.getByTitle('metric-id-123');
    expect(metricDiv).toBeInTheDocument();
  });

  it('renders metric label when metric node is found in store', () => {
    useForecastGraph.mockReturnValue({
      nodes: [
        {
          id: 'metric-id-123',
          type: 'METRIC',
          data: { label: 'Test Metric Label' },
        },
      ],
    });

    const mockData = {
      sourceMetricId: 'metric-id-123',
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Test Metric Label')).toBeInTheDocument();
    const metricDiv = screen.getByTitle('metric-id-123');
    expect(metricDiv).toBeInTheDocument();
  });

  it('renders default values when data is missing', () => {
    useForecastGraph.mockReturnValue({ nodes: [] });

    render(<SeedNode {...createNodeProps({})} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    const metricDiv = screen.getByTitle('-');
    expect(metricDiv).toBeInTheDocument();
  });

  it('renders source and target handles', () => {
    useForecastGraph.mockReturnValue({ nodes: [] });

    render(<SeedNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });

  it('handles metric node without label gracefully', () => {
    useForecastGraph.mockReturnValue({
      nodes: [
        {
          id: 'metric-id-123',
          type: 'METRIC',
          data: {},
        },
      ],
    });

    const mockData = {
      sourceMetricId: 'metric-id-123',
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Metric metric-i...')).toBeInTheDocument();
  });

  it('shows visualization overlay when slider is enabled and has value', () => {
    useForecastGraph.mockReturnValue({ nodes: [] });
    useVisualization.mockReturnValue({
      selectedVisualizationMonth: new Date('2025-01-01'),
      showVisualizationSlider: true,
      forecastStartDate: '',
      forecastEndDate: '',
    });
    useNodeVisualizationValue.mockReturnValue({
      value: 1000,
      nodeId: 'test-id',
      nodeType: 'SEED',
    });

    const mockData = {
      sourceMetricId: 'metric-id-123',
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    const overlay = screen.getByTestId('node-value-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('data-node-id', 'test-id');
    expect(overlay).toHaveAttribute('data-node-type', 'SEED');
    expect(overlay).toHaveAttribute('data-position', 'bottom-right');
    expect(overlay).toHaveAttribute('data-compact', 'true');
  });

  it('does not show visualization overlay when slider is disabled', () => {
    useForecastGraph.mockReturnValue({ nodes: [] });
    useVisualization.mockReturnValue({
      selectedVisualizationMonth: new Date('2025-01-01'),
      showVisualizationSlider: false,
      forecastStartDate: '',
      forecastEndDate: '',
    });
    useNodeVisualizationValue.mockReturnValue(null);

    const mockData = {
      sourceMetricId: 'metric-id-123',
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    const overlay = screen.queryByTestId('node-value-overlay');
    expect(overlay).not.toBeInTheDocument();
  });
});
