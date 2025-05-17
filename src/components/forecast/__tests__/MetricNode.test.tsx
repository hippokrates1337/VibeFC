import { render, screen } from '@testing-library/react';
import MetricNode from '../nodes/MetricNode';
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
  it('renders label, budgetVariableId, and historicalVariableId', () => {
    const mockData = {
      label: 'Test Metric',
      budgetVariableId: 'budget-var-id',
      historicalVariableId: 'historical-var-id'
    };

    render(<MetricNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Metric')).toBeInTheDocument();
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('budget-var-id')).toBeInTheDocument();
    expect(screen.getByText('historical-var-id')).toBeInTheDocument();
  });

  it('renders default values when data is missing', () => {
    render(<MetricNode {...createNodeProps({})} />);

    expect(screen.getByText('Metric')).toBeInTheDocument();
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