import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NodeConfigPanel from '../node-config-panel';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';

// Mock the Zustand store
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
}));

describe('NodeConfigPanel', () => {
  const user = userEvent.setup();
  
  // Setup mock implementations
  const mockUpdateNodeData = jest.fn();
  const mockDeleteNode = jest.fn();
  const mockSetSelectedNodeId = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for the store
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      // Create a mock state object
      const state = {
        selectedNodeId: 'node1',
        nodes: [
          {
            id: 'node1',
            type: 'DATA',
            data: { variableId: 'var1', offsetMonths: 3 },
            position: { x: 100, y: 100 },
          },
        ],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      
      // Call the selector with our mock state
      return selector(state);
    });
  });

  test('renders DATA node configuration form', () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    // Check header shows correct node type
    const header = screen.getByText('Configure DATA Node');
    expect(header).toBeInTheDocument();
    
    // Check for DATA node specific fields
    const variableLabel = screen.getByText('Variable');
    expect(variableLabel).toBeInTheDocument();
    
    const offsetLabel = screen.getByText('Offset (months)');
    expect(offsetLabel).toBeInTheDocument();
  });

  test('calls updateNodeData when changing DATA node fields', async () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    // Get the offset months input and change its value
    const offsetInput = screen.getByLabelText('Offset (months)') as HTMLInputElement;
    
    // First clear the input and set to 0
    fireEvent.change(offsetInput, { target: { value: '' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node1', { offsetMonths: 0 });
    
    // Then set the new value directly
    fireEvent.change(offsetInput, { target: { value: '5' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node1', { offsetMonths: 5 });
  });

  test('calls deleteNode when delete button is clicked and confirmed', async () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: 'Delete Node' });
    await user.click(deleteButton);
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);
    
    // Check if delete function was called
    expect(mockDeleteNode).toHaveBeenCalledWith('node1');
    
    // Check if selectedNodeId was set to null
    expect(mockSetSelectedNodeId).toHaveBeenCalledWith(null);
    
    // Check if panel was closed
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('closes the panel when close button is clicked', async () => {
    render(<NodeConfigPanel open={true} onOpenChange={mockOnOpenChange} />);
    
    // Find the dialog first
    const dialog = screen.getByRole('dialog');
    
    // Find the close button by its class and position in the footer
    const closeButton = within(dialog).getAllByRole('button').find(button => {
      const isInFooter = button.closest('.flex-col-reverse');
      return isInFooter && button.textContent === 'Close';
    });
    expect(closeButton).toBeDefined();
    await user.click(closeButton!);
    
    // Check if onOpenChange was called with false
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  test('renders nothing when no node is selected', () => {
    // Override the mock for this specific test
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
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
    
    // Check that the component renders nothing
    expect(container.firstChild).toBeNull();
  });
}); 