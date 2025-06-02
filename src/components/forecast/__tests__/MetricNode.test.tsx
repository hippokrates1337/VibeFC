import { render, screen } from '@/test-utils';
import MetricNode from '../nodes/MetricNode';
import '@testing-library/jest-dom';
import { NodeProps } from 'reactflow';
import { useVariableStore } from '@/lib/store/variables';

// Mock the variable store
jest.mock('@/lib/store/variables');
const mockUseVariableStore = useVariableStore as jest.MockedFunction<typeof useVariableStore>;

// Mock ReactFlow's Position enum and NodeProps
jest.mock('reactflow', () => ({
  Position: { Top: 'top', Bottom: 'bottom' },
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
}));

// Create a helper function to create the minimum required props
const createNodeProps = (data: any) => ({
  id: 'test-id',
  type: 'metric',
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

describe('MetricNode', () => {
  beforeEach(() => {
    // Mock the variable store with test variables
    mockUseVariableStore.mockImplementation((selector: any) => {
      const state = {
        variables: [
          { id: 'budget-var-id', name: 'Budget Variable', organizationId: 'org-1', type: 'BUDGET' },
          { id: 'historical-var-id', name: 'Historical Variable', organizationId: 'org-1', type: 'ACTUAL' },
        ],
      };
      return selector(state);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders label and variable names instead of IDs', () => {
    const mockData = {
      label: 'Test Metric',
      budgetVariableId: 'budget-var-id',
      historicalVariableId: 'historical-var-id',
      useCalculated: false
    };

    render(<MetricNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Metric')).toBeInTheDocument();
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('Variable')).toBeInTheDocument(); // Mode display
    expect(screen.getByText('Budget Variable')).toBeInTheDocument();
    expect(screen.getByText('Historical Variable')).toBeInTheDocument();
  });

  it('renders variable IDs when variable names are not found', () => {
    const mockData = {
      label: 'Test Metric',
      budgetVariableId: 'unknown-budget-id',
      historicalVariableId: 'unknown-historical-id',
      useCalculated: false
    };

    render(<MetricNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Metric')).toBeInTheDocument();
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('Variable')).toBeInTheDocument(); // Mode display
    expect(screen.getByText('unknown-budget-id')).toBeInTheDocument();
    expect(screen.getByText('unknown-historical-id')).toBeInTheDocument();
  });

  it('renders calculated mode correctly', () => {
    const mockData = {
      label: 'Calculated Metric',
      budgetVariableId: 'budget-var-id',
      historicalVariableId: 'historical-var-id',
      useCalculated: true
    };

    render(<MetricNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Metric')).toBeInTheDocument();
    expect(screen.getByText('Calculated Metric')).toBeInTheDocument();
    expect(screen.getByText('Calculated')).toBeInTheDocument(); // Mode display
    expect(screen.getByText('Calculated from connected nodes')).toBeInTheDocument();
    // Variable names should not be displayed in calculated mode
    expect(screen.queryByText('Budget Variable')).not.toBeInTheDocument();
    expect(screen.queryByText('Historical Variable')).not.toBeInTheDocument();
  });

  it('renders default values when data is missing', () => {
    render(<MetricNode {...createNodeProps({})} />);

    expect(screen.getByText('Metric')).toBeInTheDocument();
    expect(screen.getByText('Variable')).toBeInTheDocument(); // Default mode
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3); // Default for all fields
  });

  it('renders source and target handles', () => {
    render(<MetricNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });
}); 