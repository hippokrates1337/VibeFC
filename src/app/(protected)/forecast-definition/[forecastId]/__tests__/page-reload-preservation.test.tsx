import React from 'react';
import { render, waitFor } from '@testing-library/react';
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
  },
  mapForecastToClientFormat: jest.fn(),
}));

// Mock the stores
jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn(),
  useForecastNodes: jest.fn(() => []),
  useForecastEdges: jest.fn(() => []),
  useForecastMetadata: jest.fn(() => ({ name: '', startDate: null, endDate: null })),
  useIsForecastDirty: jest.fn(() => false),
  useLoadForecast: jest.fn(() => jest.fn()),
  useForecastOrganizationId: jest.fn(() => null),
  useForecastError: jest.fn(() => null),
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

// Mock UI components
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />,
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useParams as jest.Mock).mockReturnValue({ forecastId: 'test-forecast-id' });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useOrganizationStore as unknown as jest.Mock).mockReturnValue({ currentOrganization: { id: 'test-org-id' } });
    
    // Mock the store to return our test state
    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStoreState);
      }
      return mockStoreState;
    });

    // Mock getState to return our test state
    (useForecastGraphStore as any).getState = jest.fn().mockReturnValue(mockStoreState);
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

    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(cleanStoreState);
      }
      return cleanStoreState;
    });

    (useForecastGraphStore as any).getState = jest.fn().mockReturnValue(cleanStoreState);

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

    (useForecastGraphStore as unknown as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(differentForecastState);
      }
      return differentForecastState;
    });

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
}); 