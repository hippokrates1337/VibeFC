import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ForecastToolbar from '../forecast-toolbar';
import { useForecastGraph, useForecastGraphActions } from '@/lib/store/forecast-graph-store/hooks';
import { calculateSmartNodePosition } from '@/lib/store/forecast-graph-store/utils';
import { useToast } from '@/components/ui/use-toast';

// Mock the Zustand store and toast
jest.mock('@/lib/store/forecast-graph-store/hooks', () => ({
  useForecastGraph: jest.fn(),
  useForecastGraphActions: jest.fn(),
}));
jest.mock('@/lib/store/forecast-graph-store/utils', () => ({
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
  
  // Setup mock implementations - Updated for Phase 7 unified calculation
  const mockAddNode = jest.fn().mockReturnValue('new-node-id');
  const mockSetForecastMetadata = jest.fn();
  const mockResetStore = jest.fn();
  const mockSetSelectedNodeId = jest.fn();
  const mockSetConfigPanelOpen = jest.fn();
  const mockDuplicateNodeWithEdges = jest.fn().mockReturnValue('duplicated-node-id');
  const mockSetValidatingGraph = jest.fn();
  const mockSetGraphValidation = jest.fn();
  const mockCalculateUnified = jest.fn().mockResolvedValue(undefined); // Updated for Phase 7
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
    
    // Default mock implementation for the store - Updated for Phase 7
    (useForecastGraph as unknown as jest.Mock).mockImplementation(() => ({
      // Create a mock state object with current values
      forecastId: 'test-forecast-id',
      forecastName: 'Test Forecast',
      forecastStartDate: '2024-01-01',
      forecastEndDate: '2024-12-31',
      organizationId: 'test-org-id',
      nodes: [],
      edges: [],
      isDirty: false,
      selectedNodeId: null,
      configPanelOpen: false,
      isLoading: false,
      error: null,
      lastEditedNodePosition: null,
    }));
    
    (useForecastGraphActions as unknown as jest.Mock).mockImplementation(() => ({
      addNode: jest.fn(),
      setForecastMetadata: jest.fn(),
      resetStore: jest.fn(),
      setSelectedNodeId: jest.fn(),
      setConfigPanelOpen: jest.fn(),
      duplicateNodeWithEdges: jest.fn(),
      calculateUnified: jest.fn(),
      setGraphValidation: jest.fn(),
      setValidatingGraph: jest.fn(),
    }));
    
    // Mock the old store structure for backward compatibility
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
        calculateUnified: mockCalculateUnified, // Updated for Phase 7
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
    // Mock console.error to suppress expected error logs during this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
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
        calculateUnified: mockFailedCalculation, // Updated for Phase 7
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the calculate button - Updated text for Phase 7
    const calculateButton = screen.getByText('Calculate All (Forecast, Historical, Budget)');
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
    
    // Verify that console.error was called (but we suppressed the output)
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ForecastToolbar] Unified calculation failed:', expect.any(Error));
    
    // Restore console.error
    consoleErrorSpy.mockRestore();
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

  test('falls back to default positioning when no last edited position exists', async () => {
    // Ensure no last edited position
    mockUseLastEditedNodePosition.mockReturnValue(null);
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the DATA node button
    const dataNodeButton = screen.getByText('Data');
    await user.click(dataNodeButton);
    
    // When no last edited position exists, calculateSmartNodePosition should NOT be called
    // Instead, a default position should be used
    expect(mockCalculateSmartNodePosition).not.toHaveBeenCalled();
    
    // Check if addNode was called with a default position
    expect(mockAddNode).toHaveBeenCalledWith(expect.objectContaining({
      type: 'DATA',
      data: expect.any(Object),
      position: { x: 300, y: 200 }, // Default position from implementation
    }));
  });

  test('calls onSave when save button is clicked', async () => {
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the save button
    const saveButton = screen.getByText('Save Forecast');
    await user.click(saveButton);
    
    // Check if onSave was called
    expect(mockOnSave).toHaveBeenCalled();
    
    // Note: Success/error toasts are now handled by the parent component, not ForecastToolbar
  });

  test('calls onBack when back button is clicked', async () => {
    // Set up a clean state (not dirty) so onBack is called immediately
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        ...currentState,
        isDirty: false, // Important: not dirty so checkUnsavedChanges calls onBack immediately
        addNode: mockAddNode,
        setForecastMetadata: mockSetForecastMetadata,
        resetStore: mockResetStore,
        setSelectedNodeId: mockSetSelectedNodeId,
        setConfigPanelOpen: mockSetConfigPanelOpen,
        duplicateNodeWithEdges: mockDuplicateNodeWithEdges,
        setValidatingGraph: mockSetValidatingGraph,
        setGraphValidation: mockSetGraphValidation,
        calculateUnified: mockCalculateUnified,
      };
      return selector(state);
    });

    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the back button
    const backButton = screen.getByText('Back to List');
    await user.click(backButton);
    
    // Check if onBack was called
    expect(mockOnBack).toHaveBeenCalled();
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
        calculateUnified: mockCalculateUnified,
      };
      return selector(state);
    });
    
    render(<ForecastToolbar onSave={mockOnSave} onBack={mockOnBack} />);
    
    // Click the save button
    const saveButton = screen.getByText('Save Forecast');
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