import { render, screen } from '@/test-utils';
import SeedNode from '../nodes/SeedNode';
import '@testing-library/jest-dom';
import { NodeProps } from 'reactflow';

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
  it('renders sourceMetricId', () => {
    const mockData = {
      sourceMetricId: 'metric-id-123'
    };

    render(<SeedNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('metric-id-123')).toBeInTheDocument();
  });

  it('renders default values when data is missing', () => {
    render(<SeedNode {...createNodeProps({})} />);

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Default for sourceMetricId
  });

  it('renders source and target handles', () => {
    render(<SeedNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });
}); 