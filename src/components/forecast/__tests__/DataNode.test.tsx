import { render, screen } from '@testing-library/react';
import DataNode from '../nodes/DataNode';
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
  type: 'data',
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

describe('DataNode', () => {
  it('renders variable ID and offset months', () => {
    const mockData = {
      variableId: 'test-variable-id',
      offsetMonths: 3
    };

    render(<DataNode {...createNodeProps(mockData)} />);

    expect(screen.getByText('Data Node')).toBeInTheDocument();
    expect(screen.getByText('test-variable-id')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders default values when data is missing', () => {
    render(<DataNode {...createNodeProps({})} />);

    expect(screen.getByText('Data Node')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Default for variableId
    expect(screen.getByText('0')).toBeInTheDocument(); // Default for offsetMonths
  });

  it('renders source and target handles', () => {
    render(<DataNode {...createNodeProps({})} />);

    const sourceHandle = screen.getByTestId('handle-source');
    const targetHandle = screen.getByTestId('handle-target');

    expect(sourceHandle).toBeInTheDocument();
    expect(targetHandle).toBeInTheDocument();
    expect(sourceHandle).toHaveAttribute('data-position', 'bottom');
    expect(targetHandle).toHaveAttribute('data-position', 'top');
  });
}); 