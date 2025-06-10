import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ForecastToolbar from '../forecast-toolbar';
import { useForecastGraphStore, useLastEditedNodePosition, calculateSmartNodePosition } from '@/lib/store/forecast-graph-store';
import { useToast } from '@/components/ui/use-toast';

// Mock the Zustand store and toast
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
  useLastEditedNodePosition: jest.fn(),
  calculateSmartNodePosition: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock NodeConfigPanel
jest.mock('../node-config-panel', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="node-config-panel" />),
}));

// Mock GraphValidationDisplay
jest.mock('../graph-validation-display', () => ({
  GraphValidationDisplay: jest.fn(() => <div data-testid="graph-validation-display" />),
}));

// Mock CalculationErrorBoundary
jest.mock('../calculation-error-boundary', () => ({
  CalculationErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the GraphConverter
jest.mock('@/lib/services/forecast-calculation/graph-converter', () => ({
  GraphConverter: jest.fn().mockImplementation(() => ({
    validateGraph: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  })),
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
  const mockSetValidatingGraph = jest.fn();
  const mockSetGraphValidation = jest.fn();
  const mockCalculateForecast = jest.fn().mockResolvedValue(undefined);
  const mockToast = jest.fn();
  const mockOnSave = jest.fn().mockResolvedValue(undefined);
  const mockOnBack = jest.fn();
  const mockUseLastEditedNodePosition = useLastEditedNodePosition as jest.Mock;
  const mockCalculateSmartNodePosition = calculateSmartNodePosition as jest.Mock;

  // Track current state for the mock
  let currentState = {
    forecastId: 'test-forecast-id',
    forecastName: 'Test Forecast',
    forecastStartDate: '2023-01-01',
    forecastEndDate: '2023-12-31',
    organizationId: 'test-org-id',
    isDirty: true,
    selectedNodeId: null,
    configPanelOpen: false,
    nodes: [],
    edges: [],
    isLoading: false,
    error: null,
    organizationForecasts: [],
    graphValidation: null,
    isValidatingGraph: false,
    calculationResults: null,
    isCalculating: false,
    calculationError: null,
    lastCalculatedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the current state
    currentState = {
      forecastId: 'test-forecast-id',
      forecastName: 'Test Forecast',
      forecastStartDate: '2023-01-01',
      forecastEndDate: '2023-12-31',
      organizationId: 'test-org-id',
      isDirty: true,
      selectedNodeId: null,
      configPanelOpen: false,
      nodes: [],
      edges: [],
      isLoading: false,
      error: null,
      organizationForecasts: [],
      graphValidation: null,
      isValidatingGraph: false,
      calculationResults: null,
      isCalculating: false,
      calculationError: null,
      lastCalculatedAt: null,
    };
    
    // Mock setForecastMetadata to update the current state
    mockSetForecastMetadata.mockImplementation((update) => {
      if (update.name !== undefined) currentState.forecastName = update.name;
      if (update.startDate !== undefined) currentState.forecastStartDate = update.startDate;
      if (update.endDate !== undefined) currentState.forecastEndDate = update.endDate;
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
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      
      // Call the selector with our mock state
      return selector(state);
    });
    
    // Mock useToast
    (useToast as unknown as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
    
    // Mock the new hooks
    mockUseLastEditedNodePosition.mockReturnValue(null); // Default to no last position
    mockCalculateSmartNodePosition.mockImplementation((lastPosition, nodes) => {
      // Return a smart position or fallback to random
      if (lastPosition) {
        return { x: lastPosition.x + 150, y: lastPosition.y };
      }
      return { x: Math.random() * 300 + 50, y: Math.random() * 300 + 50 };
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
        ...currentState,
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
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
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
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
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
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
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
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
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
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      return selector(state);
    });
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Check that the duplicate button is disabled when no node is selected
    const duplicateButton = screen.getByText('Duplicate Node');
    expect(duplicateButton).toBeDisabled();
  });

  test('calculates forecast when calculate button is clicked', async () => {
    // Set up a state where calculation is possible
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        isDirty: false, // Must be saved
        nodes: [{ id: 'metric-1', type: 'METRIC', data: {} }], // Must have metric nodes
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the calculate button
    const calculateButton = screen.getByText('Calculate Forecast');
    await user.click(calculateButton);
    
    // Check if calculateForecast was called
    expect(mockCalculateForecast).toHaveBeenCalled();
    
    // Check if a success toast was shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Calculation Complete',
        description: 'Forecast has been calculated successfully.',
      }));
    });
  });

  test('shows error when calculation is attempted without saving', async () => {
    // Set up a state where forecast is dirty (not saved)
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        isDirty: true, // Not saved
        nodes: [{ id: 'metric-1', type: 'METRIC', data: {} }], // Has metric nodes
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // The calculate button should be disabled when isDirty is true
    const calculateButton = screen.getByText('Calculate Forecast');
    expect(calculateButton).toBeDisabled();
  });

  test('shows error when calculation is attempted without metric nodes', async () => {
    // Set up a state without metric nodes
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        isDirty: false, // Saved
        nodes: [{ id: 'data-1', type: 'DATA', data: {} }], // No metric nodes
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // The calculate button should be disabled when there are no metric nodes
    const calculateButton = screen.getByText('Calculate Forecast');
    expect(calculateButton).toBeDisabled();
  });

  test('disables save button when forecast is not dirty', () => {
    // Set up a state where forecast is not dirty
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        isDirty: false,
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Save button should be disabled when not dirty
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  test('shows reload button when onReload prop is provided', () => {
    const mockOnReload = jest.fn().mockResolvedValue(undefined);
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} onReload={mockOnReload} />);
    
    // Reload button should be visible
    const reloadButton = screen.getByText('Reload');
    expect(reloadButton).toBeInTheDocument();
  });

  test('does not show reload button when onReload prop is not provided', () => {
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Reload button should not be visible
    const reloadButton = screen.queryByText('Reload');
    expect(reloadButton).not.toBeInTheDocument();
  });

  test('shows status indicators when relevant', () => {
    // Set up a state with both dirty state and selected node
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        isDirty: true,
        selectedNodeId: 'selected-node-id',
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Should show status section with both indicators
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByText('Node selected')).toBeInTheDocument();
  });

  test('shows graph status information', () => {
    // Set up a state with some nodes and edges
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        nodes: [
          { id: 'data-1', type: 'DATA', data: {} },
          { id: 'metric-1', type: 'METRIC', data: {} },
          { id: 'operator-1', type: 'OPERATOR', data: {} },
        ],
        edges: [
          { id: 'edge-1', source: 'data-1', target: 'operator-1' },
        ],
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockCalculateForecast,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Should show graph status information
    expect(screen.getByText('Nodes: 3')).toBeInTheDocument();
    expect(screen.getByText('Edges: 1')).toBeInTheDocument();
    expect(screen.getByText('Metric Nodes: 1')).toBeInTheDocument();
    expect(screen.getByText('Data Nodes: 1')).toBeInTheDocument();
    expect(screen.getByText('Operator Nodes: 1')).toBeInTheDocument();
  });

  test('adds different types of nodes correctly', async () => {
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Test each node type button
    const nodeTypes = [
      { buttonText: 'Data', expectedType: 'DATA' },
      { buttonText: 'Constant', expectedType: 'CONSTANT' },
      { buttonText: 'Operator', expectedType: 'OPERATOR' },
      { buttonText: 'Metric', expectedType: 'METRIC' },
      { buttonText: 'Seed', expectedType: 'SEED' },
    ];

    for (const { buttonText, expectedType } of nodeTypes) {
      const button = screen.getByText(buttonText);
      await user.click(button);
      
      expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({
        type: expectedType,
        data: expect.any(Object),
        position: expect.any(Object),
      }));
    }
    
    // Should have been called 5 times (once for each node type)
    expect(mockAddNode).toHaveBeenCalledTimes(5);
  });

  test('handles calculation failure with error toast', async () => {
    const mockFailedCalculation = jest.fn().mockRejectedValue(new Error('Calculation failed'));
    
    // Set up a state where calculation is possible but will fail
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        isDirty: false,
        nodes: [{ id: 'metric-1', type: 'METRIC', data: {} }],
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateForecast: mockFailedCalculation,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the calculate button
    const calculateButton = screen.getByText('Calculate Forecast');
    await user.click(calculateButton);
    
    // Wait for the error handling
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Calculation Failed',
        description: 'Calculation failed',
        variant: 'destructive',
      }));
    });
    
    // Ensure validation state is reset
    expect(mockSetValidatingGraph).toHaveBeenCalledWith(false);
  });

  test('handles save failure with error toast', async () => {
    const mockFailedSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    
    render(<ForecastToolbar onSave={mockFailedSave} onBack={mockOnBack} />);
    
    // Click the save button
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    // Wait for the error handling
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        description: 'Failed to save forecast. Please try again.',
        variant: 'destructive',
      }));
    });
  });

  test('uses smart positioning when adding nodes', async () => {
    // Set up a last edited position
    const lastPosition = { x: 200, y: 150 };
    mockUseLastEditedNodePosition.mockReturnValue(lastPosition);
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the DATA node button
    const dataNodeButton = screen.getByText('Data');
    await user.click(dataNodeButton);
    
    // Check if calculateSmartNodePosition was called with the correct parameters
    expect(mockCalculateSmartNodePosition).toHaveBeenCalledWith(lastPosition, []);
    
    // Check if addNode was called with the smart position
    expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({
      type: 'DATA',
      data: expect.any(Object),
      position: expect.any(Object),
    }));
  });

  test('falls back to random positioning when no last edited position exists', async () => {
    // Ensure no last edited position
    mockUseLastEditedNodePosition.mockReturnValue(null);
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the DATA node button
    const dataNodeButton = screen.getByText('Data');
    await user.click(dataNodeButton);
    
    // Check if calculateSmartNodePosition was called with null position
    expect(mockCalculateSmartNodePosition).toHaveBeenCalledWith(null, []);
    
    // Check if addNode was still called
    expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({
      type: 'DATA',
      data: expect.any(Object),
      position: expect.any(Object),
    }));
  });
}); 