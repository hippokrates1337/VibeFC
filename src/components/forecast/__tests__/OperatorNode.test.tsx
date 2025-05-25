import { render, screen } from '@testing-library/react';
import OperatorNode from '../nodes/OperatorNode';
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
  type: 'operator',
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

describe('OperatorNode', () => {
  it('renders operator and input count', () => {
    const mockData = {
      op: '+',
      inputOrder: ['node1', 'node2']
    };

    render(<OperatorNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByText('2 connected')).toBeInTheDocument();
  });

  it('renders default values when data is missing', () => {
    render(<OperatorNode {...createNodeProps({})} />);

    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Default operation
    expect(screen.getByText('0 connected')).toBeInTheDocument(); // Default input count
  });

  it('renders source and target handles', () => {
    render(<OperatorNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });
}); 