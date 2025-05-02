import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataIntakeContainer } from '../_components/data-intake-container';
import {
  useVariableStore,
  useSetSelectedOrganizationId,
  useIsVariablesLoading,
  useFetchVariables,
  useVariableError,
  Variable
} from '@/lib/store/variables';
import { useOrganizationStore } from '@/lib/store/organization';
import { useAuth } from '@/providers/auth-provider';
import { useVariableApi, useCsvProcessor } from '../_components/api-hooks';

// Type cast the imported hooks AFTER jest.mock call
// Use `as unknown as jest.Mock` for Zustand hooks if direct casting fails
const mockedUseVariableStore = useVariableStore as unknown as jest.Mock;
const mockedUseSetSelectedOrganizationId = useSetSelectedOrganizationId as jest.Mock;
const mockedUseIsVariablesLoading = useIsVariablesLoading as jest.Mock;
const mockedUseFetchVariables = useFetchVariables as jest.Mock;
const mockedUseVariableError = useVariableError as jest.Mock;
const mockedUseOrganizationStore = useOrganizationStore as unknown as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
const mockedUseVariableApi = useVariableApi as jest.Mock;
const mockedUseCsvProcessor = useCsvProcessor as jest.Mock;

// Mock the Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading Icon</div>,
}));

// Mock the individual hooks from the stores and providers
jest.mock('@/lib/store/variables', () => ({
  useVariableStore: jest.fn(),
  useSetSelectedOrganizationId: jest.fn(() => jest.fn()),
  useIsVariablesLoading: jest.fn(() => false),
  useFetchVariables: jest.fn(() => jest.fn()),
  useVariableError: jest.fn(() => null),
}));

jest.mock('@/lib/store/organization', () => ({
  useOrganizationStore: jest.fn(),
}));

// Mock the useAuth hook
jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

// Mock the local custom hooks
jest.mock('../_components/api-hooks', () => ({
  useVariableApi: jest.fn(),
  useCsvProcessor: jest.fn(),
}));

// Mock the components used by the container
jest.mock('../_components/data-table', () => ({
  DataTable: jest.fn(() => <div data-testid="mock-data-table">Data Table Component</div>),
}));

jest.mock('../_components/upload-section', () => ({
  UploadSection: jest.fn(() => <div data-testid="mock-upload-section">Upload Section Component</div>),
}));

jest.mock('../import-modal', () => ({
  ImportModal: jest.fn(() => <div data-testid="mock-import-modal">Import Modal Component</div>),
}));

jest.mock('../delete-confirmation-modal', () => ({
  DeleteConfirmationModal: jest.fn(() => <div data-testid="mock-delete-confirmation-modal">Delete Confirmation Modal</div>),
}));

// Mock state display components using jest.fn()
jest.mock('../_components/state-display', () => ({
  LoadingState: jest.fn(() => <div data-testid="mock-loading-state">Loading...</div>),
  ErrorState: jest.fn(({ errorMessage }: { errorMessage: string }) => <div data-testid="mock-error-state">{errorMessage}</div>),
  EmptyState: jest.fn(({ message }: { message: string }) => <div data-testid="mock-empty-state">{message}</div>),
}));

// Mock the UI components
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>,
}));

describe('DataIntakeContainer', () => {
  // Setup default mock implementations before each test
  beforeEach(() => {
    // Restore mocks to default behavior
    mockedUseVariableStore.mockImplementation((selector) => selector({ variables: [], selectedOrganizationId: null }));
    mockedUseOrganizationStore.mockReturnValue({ currentOrganization: { id: 'org-123', name: 'Test Org' } });
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      session: { access_token: 'mock-token' },
      isLoading: false,
    });
    mockedUseIsVariablesLoading.mockReturnValue(false);
    mockedUseVariableError.mockReturnValue(null);
    mockedUseSetSelectedOrganizationId.mockReturnValue(jest.fn());
    mockedUseFetchVariables.mockReturnValue(jest.fn());
    mockedUseVariableApi.mockReturnValue({
      apiStatus: { success: null, error: null },
      handleImportVariables: jest.fn(),
      handleDeleteVariable: jest.fn(),
      handleUpdateVariable: jest.fn(),
    });
    mockedUseCsvProcessor.mockReturnValue({
      isUploading: false,
      error: null,
      processedVariables: [],
      setProcessedVariables: jest.fn(),
      showImportModal: false,
      setShowImportModal: jest.fn(),
      parseCSV: jest.fn(),
    });
     // Reset specific component mocks if needed - handled by jest.clearAllMocks()
     // No need to call .mockClear() here for components mocked with jest.fn()
     require('../_components/data-table').DataTable.mockClear();
     require('../_components/upload-section').UploadSection.mockClear();
     require('../import-modal').ImportModal.mockClear();
     require('../delete-confirmation-modal').DeleteConfirmationModal.mockClear();
    // Remove explicit clear for state-display components
    // require('../_components/state-display').LoadingState.mockClear();
    // require('../_components/state-display').ErrorState.mockClear();
    // require('../_components/state-display').EmptyState.mockClear();

  });

  // Reset all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('displays loading state when variables are loading', () => {
    // Override default mock for this test
    mockedUseIsVariablesLoading.mockReturnValue(true);

    render(<DataIntakeContainer />);

    expect(screen.getByTestId('mock-loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-data-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-error-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-empty-state')).not.toBeInTheDocument();
  });

  test('displays loading state when auth is loading', () => {
    // Override default mock for this test
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
    });

    render(<DataIntakeContainer />);

    expect(screen.getByTestId('mock-loading-state')).toBeInTheDocument();
  });

  test('displays error state when there is a variable fetch error', () => {
    const errorMessage = 'Failed to fetch variables';
    // Override default mock for this test
    mockedUseVariableError.mockReturnValue(errorMessage);

    render(<DataIntakeContainer />);

    expect(screen.getByTestId('mock-error-state')).toHaveTextContent(errorMessage);
    expect(screen.queryByTestId('mock-data-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-loading-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-empty-state')).not.toBeInTheDocument();
  });

  test('displays empty state when there are no variables for the selected org', () => {
    // Use default mocks which include empty variables and a selected org
    mockedUseVariableStore.mockImplementation((selector) => {
       const state = { variables: [], selectedOrganizationId: 'org-123' };
       return selector(state);
    });

    render(<DataIntakeContainer />);

    expect(screen.getByTestId('mock-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('mock-upload-section')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-data-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-loading-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-error-state')).not.toBeInTheDocument();
  });

  test('displays data table when variables exist for the selected org', () => {
    const mockVariables: Variable[] = [
      {
        id: '1',
        name: 'Variable 1',
        type: 'ACTUAL',
        organizationId: 'org-123', // Matches selected org
        timeSeries: [{ date: new Date('2023-01-01'), value: 100 }]
      },
      {
        id: '2',
        name: 'Variable 2',
        type: 'BUDGET',
        organizationId: 'org-456', // Does not match selected org
        timeSeries: [{ date: new Date('2023-01-01'), value: 200 }]
      },
      {
        id: '3',
        name: 'Variable 3',
        type: 'INPUT',
        organizationId: 'org-123', // Matches selected org
        timeSeries: [{ date: new Date('2023-02-01'), value: 300 }]
      }
    ];

    // Override default mock for this test
    mockedUseVariableStore.mockImplementation((selector) => {
       const state = { variables: mockVariables, selectedOrganizationId: 'org-123' };
       return selector(state);
    });

    render(<DataIntakeContainer />)

    expect(screen.getByTestId('mock-data-table')).toBeInTheDocument();
    expect(screen.getByTestId('mock-upload-section')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-empty-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-loading-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-error-state')).not.toBeInTheDocument();

    // Verify that the DataTable receives only the filtered variables
    const DataTableMock = require('../_components/data-table').DataTable;
    expect(DataTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.arrayContaining([ // Check presence of correct variables
          expect.objectContaining({ id: '1', organizationId: 'org-123' }),
          expect.objectContaining({ id: '3', organizationId: 'org-123' }),
        ]),
        dates: expect.any(Array),
      }),
      expect.anything()
    );

    // Additional check: ensure the filtered array has the correct length
    const receivedProps = DataTableMock.mock.calls[0][0];
    expect(receivedProps.variables).toHaveLength(2);
    // Check that the variable from the other org is NOT included
    expect(receivedProps.variables.find((v: Variable) => v.id === '2')).toBeUndefined();

    // More specific date check
     const passedDates = receivedProps.dates;
     expect(passedDates).toHaveLength(2);
     expect(passedDates[0]).toBeInstanceOf(Date);
     expect(passedDates[0].getFullYear()).toBe(2023);
     expect(passedDates[0].getMonth()).toBe(0); // January
     expect(passedDates[0].getDate()).toBe(1);
     expect(passedDates[1]).toBeInstanceOf(Date);
     expect(passedDates[1].getFullYear()).toBe(2023);
     expect(passedDates[1].getMonth()).toBe(1); // February
     expect(passedDates[1].getDate()).toBe(1);
  });
}); 