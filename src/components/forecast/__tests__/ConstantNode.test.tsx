import { render, screen } from '@/test-utils';
import ConstantNode from '../nodes/ConstantNode';
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
  type: 'constant',
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

describe('ConstantNode', () => {
  it('renders constant value', () => {
    const mockData = {
      value: 42
    };

    render(<ConstantNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Constant')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders default value when data is missing', () => {
    render(<ConstantNode {...createNodeProps({})} />);

    expect(screen.getByText('Constant')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Default for value
  });

  it('renders source and target handles', () => {
    render(<ConstantNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });
}); 