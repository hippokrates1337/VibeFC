import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import NodeConfigPanel from '../node-config-panel';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';
import { useVariableStore } from '@/lib/store/variables';

// Mock the stores
jest.mock('@/lib/store/forecast-graph-store');
jest.mock('@/lib/store/variables');

const mockUseForecastGraphStore = useForecastGraphStore as jest.MockedFunction<typeof useForecastGraphStore>;
const mockUseVariableStore = useVariableStore as jest.MockedFunction<typeof useVariableStore>;

describe('NodeConfigPanel', () => {
  const user = userEvent.setup();
  const mockUpdateNodeData = jest.fn();
  const mockDeleteNode = jest.fn();
  const mockSetSelectedNodeId = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation for the stores
    mockUseForecastGraphStore.mockImplementation((selector: any) => {
      const state = {
        selectedNodeId: 'test-node',
        nodes: [
          {
            id: 'test-node',
            type: 'DATA',
            data: { variableId: 'var1', offsetMonths: 3 },
            position: { x: 100, y: 100 },
          },
        ],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(state);
    });

    mockUseVariableStore.mockImplementation((selector: any) => {
      const state = {
        variables: [
          { id: 'var1', name: 'Test Variable 1', organizationId: 'org-1', type: 'ACTUAL' },
          { id: 'var2', name: 'Test Variable 2', organizationId: 'org-1', type: 'BUDGET' },
        ],
        selectedOrganizationId: 'org-1',
      };
      return selector(state);
    });
  });

  it('renders DATA node configuration form', () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    expect(screen.getByText('Configure DATA Node')).toBeInTheDocument();
    expect(screen.getByText('Variable')).toBeInTheDocument();
    expect(screen.getByText('Offset (months)')).toBeInTheDocument();
  });

  it('renders CONSTANT node configuration form', () => {
    // Override mock for CONSTANT node
    mockUseForecastGraphStore.mockImplementation((selector: any) => {
      const state = {
        selectedNodeId: 'constant-node',
        nodes: [
          {
            id: 'constant-node',
            type: 'CONSTANT',
            data: { value: 42 },
            position: { x: 100, y: 100 },
          },
        ],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(state);
    });

    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    expect(screen.getByText('Configure CONSTANT Node')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('updates local state immediately when input changes', () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    const offsetInput = screen.getByLabelText('Offset (months)') as HTMLInputElement;
    
    fireEvent.change(offsetInput, { target: { value: '5' } });
    
    // Local state should update immediately
    expect(offsetInput.value).toBe('5');
  });

  it('calls deleteNode when delete button is clicked and confirmed', async () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: 'Delete Node' });
    await user.click(deleteButton);
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('test-node');
    expect(mockSetSelectedNodeId).toHaveBeenCalledWith(null);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes the panel when close button is clicked', async () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing when no node is selected', () => {
    // Override mock for no selection
    mockUseForecastGraphStore.mockImplementation((selector: any) => {
      const state = {
        selectedNodeId: null,
        nodes: [],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(state);
    });
    
    const { container } = render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders METRIC node form with budget and historical variable selects', () => {
    // Override mock for METRIC node
    mockUseForecastGraphStore.mockImplementation((selector: any) => {
      const state = {
        selectedNodeId: 'metric-node',
        nodes: [
          {
            id: 'metric-node',
            type: 'METRIC',
            data: { 
              label: 'Test Metric',
              budgetVariableId: 'var2',
              historicalVariableId: 'var1'
            },
            position: { x: 100, y: 100 },
          },
        ],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(state);
    });

    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    expect(screen.getByText('Configure METRIC Node')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Budget Variable')).toBeInTheDocument();
    expect(screen.getByText('Historical Variable')).toBeInTheDocument();
  });
}); 