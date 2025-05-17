import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForecastToolbar from '../forecast-toolbar';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';
import { useToast } from '@/components/ui/use-toast';

// Mock the Zustand store and toast
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock NodeConfigPanel
jest.mock('../node-config-panel', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="node-config-panel" />),
}));

describe('ForecastToolbar', () => {
  const user = userEvent.setup();
  
  // Setup mock implementations
  const mockAddNode = jest.fn().mockReturnValue('new-node-id');
  const mockSetForecastMetadata = jest.fn();
  const mockResetStore = jest.fn();
  const mockSetSelectedNodeId = jest.fn();
  const mockToast = jest.fn();
  const mockOnSave = jest.fn().mockResolvedValue(undefined);

  // Track current state for the mock
  let currentState = {
    forecastName: 'Test Forecast',
    forecastStartDate: '2023-01-01',
    forecastEndDate: '2023-12-31',
    isDirty: true,
    selectedNodeId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the current state
    currentState = {
      forecastName: 'Test Forecast',
      forecastStartDate: '2023-01-01',
      forecastEndDate: '2023-12-31',
      isDirty: true,
      selectedNodeId: null,
    };
    
    // Mock setForecastMetadata to update the current state
    mockSetForecastMetadata.mockImplementation((update) => {
      currentState = { ...currentState, ...update };
    });
    
    // Default mock implementation for the store
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      // Create a mock state object with current values
      const state = {
        ...currentState,
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      
      // Call the selector with our mock state
      return selector(state);
    });
    
    // Mock useToast
    (useToast as unknown as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
  });

  test('renders forecast metadata fields', () => {
    render(<ForecastToolbar onSave={mockOnSave} />);
    
    // Check for forecast metadata fields with proper label associations
    const nameInput = screen.getByLabelText('Forecast Name') as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput.value).toBe('Test Forecast');
    
    const startDateButton = screen.getByLabelText('Start Date');
    expect(startDateButton).toBeInTheDocument();
    expect(startDateButton).toHaveTextContent('2023-01-01');
    
    const endDateButton = screen.getByLabelText('End Date');
    expect(endDateButton).toBeInTheDocument();
    expect(endDateButton).toHaveTextContent('2023-12-31');
  });

  test('updates forecast metadata when values change', async () => {
    const { rerender } = render(<ForecastToolbar onSave={mockOnSave} />);
    
    // Get the input elements
    const nameInput = screen.getByLabelText('Forecast Name') as HTMLInputElement;
    
    // Test initial state
    expect(nameInput.value).toBe('Test Forecast');
    
    // Test clearing the input
    fireEvent.change(nameInput, { target: { value: '' } });
    expect(mockSetForecastMetadata).toHaveBeenCalledWith({ name: '' });
    
    // Update mock state and verify UI update
    currentState.forecastName = '';
    rerender(<ForecastToolbar onSave={mockOnSave} />);
    expect(nameInput.value).toBe('');
    
    // Test setting a new value
    fireEvent.change(nameInput, { target: { value: 'Updated Forecast' } });
    expect(mockSetForecastMetadata).toHaveBeenCalledWith({ name: 'Updated Forecast' });
    
    // Update mock state and verify UI update
    currentState.forecastName = 'Updated Forecast';
    rerender(<ForecastToolbar onSave={mockOnSave} />);
    expect(nameInput.value).toBe('Updated Forecast');
    
    // Test date picker functionality
    const startDateButton = screen.getByLabelText('Start Date');
    await user.click(startDateButton);
    
    // Find and interact with the calendar
    const calendarDialog = screen.getByRole('dialog');
    expect(calendarDialog).toBeInTheDocument();
    
    // Select a date
    const dayButton = within(calendarDialog).getByRole('button', { name: /10/ });
    await user.click(dayButton);
    
    // Verify date selection
    expect(mockSetForecastMetadata).toHaveBeenCalledWith({ startDate: '2023-01-10' });
  });

  test('adds a new node when node buttons are clicked', async () => {
    render(<ForecastToolbar onSave={mockOnSave} />);
    
    // Click the DATA node button
    const dataNodeButton = screen.getByText('Data');
    await user.click(dataNodeButton);
    
    // Check if addNode was called with the correct node type
    expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({
      type: 'DATA',
      data: expect.any(Object),
      position: expect.any(Object),
    }));
    
    // Check if the selected node was set
    expect(mockSetSelectedNodeId).toHaveBeenCalledWith('new-node-id');
    
    // Check if a toast was shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Node Added',
      description: expect.stringContaining('DATA'),
    }));
  });

  test('calls onSave when save button is clicked', async () => {
    render(<ForecastToolbar onSave={mockOnSave} />);
    
    // Click the save button
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    // Check if onSave was called
    expect(mockOnSave).toHaveBeenCalled();
    
    // Wait for the async save to complete and check for success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Success',
      }));
    });
  });

  test('shows validation error when saving without required fields', async () => {
    // Override store mock to return empty values
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        forecastName: '',
        forecastStartDate: null,
        forecastEndDate: null,
        isDirty: true,
        selectedNodeId: null,
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(state);
    });
    
    render(<ForecastToolbar onSave={mockOnSave} />);
    
    // Click the save button
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    // Check that onSave was not called
    expect(mockOnSave).not.toHaveBeenCalled();
    
    // Check that an error toast was shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Validation Error',
      variant: 'destructive',
    }));
  });
}); 