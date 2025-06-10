import React from 'react';
import { render, waitFor } from '@/test-utils';
import { useParams, useRouter } from 'next/navigation';
import ForecastEditorPage from '../page';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';
import { useOrganizationStore } from '@/lib/store/organization';
import { forecastApi } from '@/lib/api/forecast';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock the forecast API
jest.mock('@/lib/api/forecast', () => ({
  forecastApi: {
    getForecast: jest.fn(),
    saveForecastGraph: jest.fn(),
    saveForecastGraphBulk: jest.fn(),
    saveForecastGraphLegacy: jest.fn(),
  },
  mapForecastToClientFormat: jest.fn(),
}));

// Mock the stores - Need to provide both the main store and all individual hooks
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
  useForecastNodes: jest.fn(),
  useForecastEdges: jest.fn(),
  useForecastMetadata: jest.fn(),
  useIsForecastDirty: jest.fn(),
  useLoadForecast: jest.fn(),
  useForecastOrganizationId: jest.fn(),
  useForecastError: jest.fn(),
}));

jest.mock('@/lib/store/organization', () => ({
  useOrganizationStore: jest.fn(),
}));

// Mock components
jest.mock('@/components/forecast/forecast-canvas', () => {
  return function MockForecastCanvas() {
    return <div data-testid="forecast-canvas">Mock Canvas</div>;
  };
});

jest.mock('@/components/forecast/forecast-toolbar', () => {
  return function MockForecastToolbar({ onSave, onBack, onReload }: any) {
    return (
      <div data-testid="forecast-toolbar">
        <button onClick={onSave} data-testid="save-button">Save</button>
        <button onClick={onBack} data-testid="back-button">Back</button>
        {onReload && <button onClick={onReload} data-testid="reload-button">Reload</button>}
      </div>
    );
  };
});

jest.mock('@/components/forecast/calculation-results-table', () => ({
  CalculationResultsTable: function MockCalculationResultsTable() {
    return <div data-testid="calculation-results-table">Mock Results Table</div>;
  },
}));

// Mock UI components
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

// Mock Card components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
}));

// Mock AlertDialog components
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="alert-dialog-action" onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
}));

describe('ForecastEditorPage - Reload Preservation', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockStoreState = {
    forecastId: 'test-forecast-id',
    forecastName: 'Test Forecast',
    forecastStartDate: '2024-01-01',
    forecastEndDate: '2024-12-31',
    organizationId: 'test-org-id',
    nodes: [
      { id: 'node-1', type: 'CONSTANT', data: { value: 10 }, position: { x: 0, y: 0 } }
    ],
    edges: [],
    isDirty: true,
    selectedNodeId: null,
    isLoading: false,
    error: null,
    organizationForecasts: [],
    setDirty: jest.fn(),
    setError: jest.fn(),
    resetStore: jest.fn(),
    loadForecast: jest.fn(),
  };

  // Mock functions for individual hooks - create once and reuse to prevent dependency changes
  const mockLoadForecast = jest.fn();
  const mockSetDirty = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    // Reset mock calls but keep the same function instances
    mockLoadForecast.mockClear();
    mockSetDirty.mockClear();
    mockSetError.mockClear();
    
    (useParams as jest.Mock).mockReturnValue({ forecastId: 'test-forecast-id' });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useOrganizationStore as unknown as jest.Mock).mockReturnValue({ currentOrganization: { id: 'test-org-id' } });
    
    // Set up the main store mock - this is used for direct calls like useForecastGraphStore(state => state.setDirty)
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        const state = {
          ...mockStoreState,
          setDirty: mockSetDirty,
          setError: mockSetError,
        };
        return selector(state);
      }
      return mockStoreState;
    });

    // Set up getState method for store
    (useForecastGraphStore as any).getState = jest.fn().mockReturnValue({
      ...mockStoreState,
      setDirty: mockSetDirty,
      setError: mockSetError,
    });

    // Set up individual hook mocks - these are imported and used directly
    const { 
      useForecastNodes, 
      useForecastEdges, 
      useForecastMetadata, 
      useIsForecastDirty,
      useLoadForecast,
      useForecastOrganizationId,
      useForecastError 
    } = require('@/lib/store/forecast-graph-store');

    (useForecastNodes as jest.Mock).mockReturnValue(mockStoreState.nodes);
    (useForecastEdges as jest.Mock).mockReturnValue(mockStoreState.edges);
    (useForecastMetadata as jest.Mock).mockReturnValue({
      name: mockStoreState.forecastName,
      startDate: mockStoreState.forecastStartDate,
      endDate: mockStoreState.forecastEndDate,
    });
    (useIsForecastDirty as jest.Mock).mockReturnValue(mockStoreState.isDirty);
    (useLoadForecast as jest.Mock).mockReturnValue(mockLoadForecast);
    (useForecastOrganizationId as jest.Mock).mockReturnValue(mockStoreState.organizationId);
    (useForecastError as jest.Mock).mockReturnValue(mockStoreState.error);

    // Mock mapForecastToClientFormat
    const { mapForecastToClientFormat } = require('@/lib/api/forecast');
    (mapForecastToClientFormat as jest.Mock).mockImplementation((data) => data);
  });

  it('should preserve unsaved changes when page reloads', async () => {
    const mockGetForecast = forecastApi.getForecast as jest.Mock;
    
    // Mock API response
    mockGetForecast.mockResolvedValue({
      data: {
        id: 'test-forecast-id',
        name: 'Test Forecast',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        organizationId: 'test-org-id',
        nodes: [], // Empty nodes from server
        edges: [],
      },
      error: null,
    });

    render(<ForecastEditorPage />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(document.querySelector('[data-testid="forecast-canvas"]')).toBeInTheDocument();
    });

    // Verify that API was not called because we have unsaved changes
    expect(mockGetForecast).not.toHaveBeenCalled();
  });

  it('should reload fresh data when no unsaved changes exist', async () => {
    const mockGetForecast = forecastApi.getForecast as jest.Mock;
    
    // Mock store state with no unsaved changes
    const cleanStoreState = {
      ...mockStoreState,
      isDirty: false,
      nodes: [],
    };

    // Update all the mocks for clean state
    (useForecastGraphStore as any).getState = jest.fn().mockReturnValue(cleanStoreState);
    
    const { 
      useForecastNodes, 
      useIsForecastDirty,
    } = require('@/lib/store/forecast-graph-store');
    
    (useForecastNodes as jest.Mock).mockReturnValue(cleanStoreState.nodes);
    (useIsForecastDirty as jest.Mock).mockReturnValue(cleanStoreState.isDirty);

    mockGetForecast.mockResolvedValue({
      data: {
        id: 'test-forecast-id',
        name: 'Test Forecast',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        organizationId: 'test-org-id',
        nodes: [{ id: 'server-node', type: 'CONSTANT', data: { value: 20 }, position: { x: 100, y: 100 } }],
        edges: [],
      },
      error: null,
    });

    render(<ForecastEditorPage />);

    // Wait for API call to complete
    await waitFor(() => {
      expect(mockGetForecast).toHaveBeenCalledWith('test-forecast-id');
    });
  });

  it('should reload fresh data when different forecast ID', async () => {
    const mockGetForecast = forecastApi.getForecast as jest.Mock;
    
    // Mock store state with different forecast ID
    const differentForecastState = {
      ...mockStoreState,
      forecastId: 'different-forecast-id',
    };

    (useForecastGraphStore as any).getState = jest.fn().mockReturnValue(differentForecastState);

    mockGetForecast.mockResolvedValue({
      data: {
        id: 'test-forecast-id',
        name: 'Test Forecast',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        organizationId: 'test-org-id',
        nodes: [],
        edges: [],
      },
      error: null,
    });

    render(<ForecastEditorPage />);

    // Should call API because forecast ID is different
    await waitFor(() => {
      expect(mockGetForecast).toHaveBeenCalledWith('test-forecast-id');
    });
  });

  it('should not call resetStore on component re-render', async () => {
    const mockGetForecast = forecastApi.getForecast as jest.Mock;
    
    mockGetForecast.mockResolvedValue({
      data: {
        id: 'test-forecast-id',
        name: 'Test Forecast',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        organizationId: 'test-org-id',
        nodes: [],
        edges: [],
      },
      error: null,
    });

    const { rerender } = render(<ForecastEditorPage />);

    // Wait for initial render
    await waitFor(() => {
      expect(document.querySelector('[data-testid="forecast-canvas"]')).toBeInTheDocument();
    });

    // Clear the resetStore mock calls from initial render
    mockStoreState.resetStore.mockClear();

    // Re-render the component (simulating what happens during browser restore)
    rerender(<ForecastEditorPage />);

    // Verify that resetStore was NOT called during re-render
    expect(mockStoreState.resetStore).not.toHaveBeenCalled();
  });

  it('should handle save functionality with toolbar integration', async () => {
    const mockSaveForecastGraph = forecastApi.saveForecastGraph as jest.Mock;
    
    mockSaveForecastGraph.mockResolvedValue({
      data: {
        id: 'test-forecast-id',
        name: 'Test Forecast',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        organizationId: 'test-org-id',
        nodes: mockStoreState.nodes,
        edges: mockStoreState.edges,
      },
      error: null,
    });

    render(<ForecastEditorPage />);

    // Wait for component to render
    await waitFor(() => {
      expect(document.querySelector('[data-testid="forecast-canvas"]')).toBeInTheDocument();
    });

    // Find and click the save button in the toolbar
    const saveButton = document.querySelector('[data-testid="save-button"]') as HTMLElement;
    expect(saveButton).toBeInTheDocument();
    
    // Trigger save - this will test the integration between page and toolbar
    saveButton.click();

    // Verify save was called with correct parameters
    await waitFor(() => {
      expect(mockSaveForecastGraph).toHaveBeenCalledWith(
        'test-forecast-id',
        mockStoreState.forecastName,
        mockStoreState.forecastStartDate,
        mockStoreState.forecastEndDate,
        mockStoreState.nodes,
        mockStoreState.edges
      );
    });
  });

  it('should show error state when store has error', async () => {
    // Mock store hooks to return error state
    const { useForecastError } = require('@/lib/store/forecast-graph-store');
    (useForecastError as jest.Mock).mockReturnValue('Test error message');

    render(<ForecastEditorPage />);

    // Should show error message instead of canvas
    await waitFor(() => {
      expect(document.querySelector('[data-testid="forecast-canvas"]')).not.toBeInTheDocument();
      expect(document.body.textContent).toContain('Error: Test error message');
    });
  });
}); 