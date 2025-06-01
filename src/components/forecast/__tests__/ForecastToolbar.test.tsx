import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/test-utils';
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
  const mockSetConfigPanelOpen = jest.fn();
  const mockDuplicateNodeWithEdges = jest.fn().mockReturnValue('duplicated-node-id');
  const mockToast = jest.fn();
  const mockOnSave = jest.fn().mockResolvedValue(undefined);
  const mockOnBack = jest.fn();

  // Track current state for the mock
  let currentState = {
    forecastName: 'Test Forecast',
    forecastStartDate: '2023-01-01',
    forecastEndDate: '2023-12-31',
    isDirty: true,
    selectedNodeId: null,
    configPanelOpen: false,
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
      configPanelOpen: false,
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
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
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
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
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
    const { rerender } = render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Get the input elements
    const nameInput = screen.getByLabelText('Forecast Name') as HTMLInputElement;
    
    // Test initial state
    expect(nameInput.value).toBe('Test Forecast');
    
    // Test clearing the input
    fireEvent.change(nameInput, { target: { value: '' } });
    expect(mockSetForecastMetadata).toHaveBeenCalledWith({ name: '' });
    
    // Update mock state and verify UI update
    currentState.forecastName = '';
    rerender(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    expect(nameInput.value).toBe('');
    
    // Test setting a new value
    fireEvent.change(nameInput, { target: { value: 'Updated Forecast' } });
    expect(mockSetForecastMetadata).toHaveBeenCalledWith({ name: 'Updated Forecast' });
    
    // Update mock state and verify UI update
    currentState.forecastName = 'Updated Forecast';
    rerender(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
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
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
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
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
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
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
      };
      return selector(state);
    });
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
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

  test('calls onBack when back button is clicked', async () => {
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the back button
    const backButton = screen.getByText('Back to Forecasts');
    await user.click(backButton);
    
    // Check if onBack was called
    expect(mockOnBack).toHaveBeenCalled();
  });

  test('shows duplicate node button when a node is selected', () => {
    // Override store mock to have a selected node
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        selectedNodeId: 'selected-node-id',
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Check that the duplicate button is visible
    const duplicateButton = screen.getByText('Duplicate Node');
    expect(duplicateButton).toBeInTheDocument();
  });

  test('duplicates node when duplicate button is clicked', async () => {
    // Override store mock to have a selected node
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        selectedNodeId: 'selected-node-id',
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the duplicate button
    const duplicateButton = screen.getByText('Duplicate Node');
    await user.click(duplicateButton);
    
    // Check if duplicateNodeWithEdges was called with the correct node ID
    expect(mockDuplicateNodeWithEdges).toHaveBeenCalledWith('selected-node-id');
    
    // Check if the new duplicated node was selected
    expect(mockSetSelectedNodeId).toHaveBeenCalledWith('duplicated-node-id');
    
    // Check if a success toast was shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Node Duplicated',
      description: 'Node and its connections have been duplicated.',
    }));
  });

  test('shows error when duplication fails', async () => {
    // Mock duplication to return null (failure)
    const mockFailedDuplication = jest.fn().mockReturnValue(null);
    
    // Override store mock to have a selected node
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        selectedNodeId: 'selected-node-id',
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockFailedDuplication,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the duplicate button
    const duplicateButton = screen.getByText('Duplicate Node');
    await user.click(duplicateButton);
    
    // Check if duplicateNodeWithEdges was called
    expect(mockFailedDuplication).toHaveBeenCalledWith('selected-node-id');
    
    // Check if an error toast was shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Duplication Failed',
      description: 'Could not duplicate the selected node.',
      variant: 'destructive',
    }));
  });

  test('hides duplicate button when no node is selected', () => {
    // Ensure the mock has no selected node
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        selectedNodeId: null,
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
      };
      return selector(state);
    });
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Check that the duplicate button is disabled when no node is selected
    const duplicateButton = screen.getByText('Duplicate Node');
    expect(duplicateButton).toBeDisabled();
  });
}); 