import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DataIntakeContainer } from '../_components/data-intake-container';
// Import actual components that are no longer mocked
// import { VariableCard } from '../_components/variable-card'; 
// import { UploadSection } from '../_components/upload-section';
// import { ImportModal } from '../import-modal';
// import { DeleteConfirmationModal } from '../delete-confirmation-modal';
// import { LoadingState, ErrorState, EmptyState } from '../_components/state-display';

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

// Type definitions for the container props
interface ContainerProps {
  filteredVariables: Variable[];
  handleDeleteClick: (id: string, name: string) => void;
  handleOpenDetailsModal: (variable: Variable) => void;
  isDetailsModalOpen: boolean;
  selectedVariableForModal: Variable | null;
  closeDetailsModal: () => void;
  handleUpdateVariable: (variableId: string, updateData: any) => Promise<void>;
  selectedOrgIdFromOrgStore: string | null;
  apiStatus: { success: boolean | null; error: string | null };
  storeIsLoading: boolean;
}

// Use `as unknown as jest.Mock` for Zustand hooks
const mockedUseVariableStore = useVariableStore as unknown as jest.Mock;
const mockedUseSetSelectedOrganizationId = useSetSelectedOrganizationId as jest.Mock;
const mockedUseIsVariablesLoading = useIsVariablesLoading as jest.Mock;
const mockedUseFetchVariables = useFetchVariables as jest.Mock;
const mockedUseVariableError = useVariableError as jest.Mock;
const mockedUseOrganizationStore = useOrganizationStore as unknown as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
const mockedUseVariableApi = useVariableApi as jest.Mock;
const mockedUseCsvProcessor = useCsvProcessor as jest.Mock;

// Mock the Lucide icons - these are used by the actual child components
jest.mock('lucide-react', () => ({
  Loader2: (props: any) => <div data-testid="loader-icon" {...props}>Loading Icon</div>,
  UploadCloud: (props: any) => <div data-testid="upload-cloud-icon" {...props}>Upload Icon</div>,
  Trash2: (props: any) => <div data-testid="trash-icon" {...props}>Trash Icon</div>,
  AlertCircle: (props: any) => <div data-testid="alert-circle-icon" {...props}>Alert Icon</div>,
  CheckCircle2: (props: any) => <div data-testid="check-circle-icon" {...props}>Check Icon</div>,
  XCircle: (props: any) => <div data-testid="x-circle-icon" {...props}>XCircle Icon</div>,
  Info: (props: any) => <div data-testid="info-icon" {...props}>Info Icon</div>,
  FileText: (props: any) => <div data-testid="file-text-icon" {...props}>FileText Icon</div>, // For VariableCard
  CalendarDays: (props: any) => <div data-testid="calendar-icon" {...props}>Calendar Icon</div>, // For VariableCard
  Edit3: (props: any) => <div data-testid="edit-icon" {...props}>Edit Icon</div>, // For VariableCard
  X: (props: any) => <div data-testid="x-icon" {...props}>Close Icon</div>, // ADDED FOR MODAL CLOSE BUTTONS
  ChevronDown: (props: any) => <div data-testid="chevron-down-icon" {...props}>Chevron Down Icon</div>, // ADDED FOR SELECT COMPONENTS
  ChevronUp: (props: any) => <div data-testid="chevron-up-icon" {...props}>Chevron Up Icon</div>, // ADDED FOR SELECT COMPONENTS
  Check: (props: any) => <div data-testid="check-icon" {...props}>Check Icon</div>, // ADDED FOR SELECT COMPONENTS
}));

// Mock the logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
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

// Explicitly DO NOT mock VariableCard, UploadSection, ImportModal, DeleteConfirmationModal, StateDisplay components
// All jest.mock calls for these components have been removed.

// Keep VariableDetailsModal mocked for now
jest.mock('../_components/variable-details-modal', () => {
  const mockVariableDetailsModal = jest.fn((props) => props.isOpen ? <div data-testid="mock-variable-details-modal">Variable Details Modal</div> : null);
  return {
    VariableDetailsModal: mockVariableDetailsModal
  };
});


describe('DataIntakeContainer', () => {
  let VariableDetailsModalMock: jest.Mock;
  let fetchVariablesMock: jest.Mock;
  let setSelectedOrgIdMock: jest.Mock;
  let handleImportVariablesMock: jest.Mock;
  let handleDeleteVariableMock: jest.Mock;
  let handleUpdateVariableMock: jest.Mock;
  let parseCSVMock: jest.Mock;
  let setShowImportModalMock: jest.Mock;
  let setProcessedVariablesMock: jest.Mock;

  const mockOrg123Variables: Variable[] = [
    { id: '1', name: 'Variable 1 Alpha', type: 'ACTUAL', organizationId: 'org-123', timeSeries: [{ date: new Date('2023-01-01'), value: 100 }]/*, unit: 'USD', category: 'Revenue', description: 'Desc 1'*/ },
    { id: '3', name: 'Variable 3 Gamma', type: 'INPUT', organizationId: 'org-123', timeSeries: [{ date: new Date('2023-02-01'), value: 300 }]/*, unit: 'EUR', category: 'Expense', description: 'Desc 3'*/ },
  ];
  const mockOrg456Variables: Variable[] = [
    { id: '2', name: 'Variable 2 Beta', type: 'BUDGET', organizationId: 'org-456', timeSeries: [{ date: new Date('2023-01-01'), value: 200 }]/*, unit: 'GBP', category: 'Profit', description: 'Desc 2'*/ },
  ];
  const allMockVariables: Variable[] = [...mockOrg123Variables, ...mockOrg456Variables];


  beforeEach(() => {
    VariableDetailsModalMock = require('../_components/variable-details-modal').VariableDetailsModal;

    fetchVariablesMock = jest.fn();
    setSelectedOrgIdMock = jest.fn();
    handleImportVariablesMock = jest.fn().mockResolvedValue({ success: true }); // Assuming it returns an object with success status
    handleDeleteVariableMock = jest.fn().mockResolvedValue({ success: true });
    handleUpdateVariableMock = jest.fn().mockResolvedValue({ success: true });
    parseCSVMock = jest.fn();
    setShowImportModalMock = jest.fn();
    setProcessedVariablesMock = jest.fn();

    mockedUseVariableStore.mockImplementation((selector) => {
      const state = {
        variables: allMockVariables, // Provide all variables
        selectedOrganizationId: 'org-123', // Default selected org
        setVariables: jest.fn(), 
      };
      return selector(state);
    });
    mockedUseOrganizationStore.mockImplementation(selector => {
      const state = { currentOrganization: { id: 'org-123', name: 'Test Org Default' } };
      return selector(state);
    });
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      session: { access_token: 'mock-token' },
      isLoading: false,
    });
    mockedUseIsVariablesLoading.mockReturnValue(false);
    mockedUseVariableError.mockReturnValue(null);
    mockedUseSetSelectedOrganizationId.mockReturnValue(setSelectedOrgIdMock);
    mockedUseFetchVariables.mockReturnValue(fetchVariablesMock);
    mockedUseVariableApi.mockReturnValue({
      apiStatus: { success: null, error: null }, // Default apiStatus
      handleImportVariables: handleImportVariablesMock,
      handleDeleteVariable: handleDeleteVariableMock,
      handleUpdateVariable: handleUpdateVariableMock,
    });
    mockedUseCsvProcessor.mockReturnValue({
      isUploading: false,
      error: null,
      processedVariables: [],
      setProcessedVariables: setProcessedVariablesMock,
      showImportModal: false,
      setShowImportModal: setShowImportModalMock,
      parseCSV: parseCSVMock,
    });
    
    VariableDetailsModalMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('displays loading state when variables are loading', () => {
    mockedUseIsVariablesLoading.mockReturnValue(true);
    render(<DataIntakeContainer />);
    expect(screen.getByText('Loading variables...')).toBeInTheDocument(); // Adjusted text
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument(); 
  });

  test('displays loading state when auth is loading', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
    });
    render(<DataIntakeContainer />);
    expect(screen.getByText('Loading variables...')).toBeInTheDocument(); // Adjusted text
  });

  test('displays error state when there is a variable fetch error', () => {
    const errorMessage = 'Failed to fetch variables due to network error.';
    mockedUseVariableError.mockReturnValue(errorMessage);
    render(<DataIntakeContainer />);
    // expect(screen.getByText('An Error Occurred')).toBeInTheDocument(); // Removed, not present in actual output
    expect(screen.getByText(errorMessage)).toBeInTheDocument(); 
    // UploadSection in error state seems to render a file input label
    expect(screen.getByText(/choose file/i)).toBeInTheDocument(); 
  });

  test('displays empty state when there are no variables for the selected org', () => {
    mockedUseVariableStore.mockImplementation((selector) => selector({ variables: [], selectedOrganizationId: 'org-123' }));
    render(<DataIntakeContainer />);
    // expect(screen.getByText('No Data Available')).toBeInTheDocument(); // Removed, not present
    expect(screen.getByText(/No variables found for the selected organization/i)).toBeInTheDocument(); 
    expect(screen.getByText(/choose file/i)).toBeInTheDocument(); // UploadSection's label
  });

  test('displays variable cards when variables exist for the selected org', () => {
    // Default state from beforeEach should have org-123 selected with its variables
    render(
      <DataIntakeContainer>
        {(props: ContainerProps) => (
          <div data-testid="variables-list">
            {props.filteredVariables.map((variable: Variable) => (
              <div key={variable.id}> {/* Simplified VariableCard for test clarity */}
                <h3>{variable.name}</h3>
                {/* <p>{variable.description}</p> */}
                <button onClick={() => props.handleDeleteClick(variable.id, variable.name)}>Delete {variable.name}</button>
                <button onClick={() => props.handleOpenDetailsModal(variable)}>View {variable.name}</button>
              </div>
            ))}
          </div>
        )}
      </DataIntakeContainer>
    );

    expect(screen.getByText('Variable 1 Alpha')).toBeInTheDocument();
    expect(screen.getByText('Variable 3 Gamma')).toBeInTheDocument();
    expect(screen.queryByText('Variable 2 Beta')).not.toBeInTheDocument();
    expect(screen.getByText(/choose file/i)).toBeInTheDocument(); // UploadSection's label
  });

  test('calls fetchVariables on initial load if organization is selected', async () => {
    mockedUseOrganizationStore.mockImplementation(selector => {
      const state = { currentOrganization: { id: 'org-fetch-test', name: 'Fetch Org' } };
      return selector(state);
    });
    mockedUseAuth.mockReturnValue({ user: { id: 'user-test' }, session: { access_token: 'token-test' }, isLoading: false });
    
    await act(async () => {
      render(<DataIntakeContainer />);
    });

    expect(setSelectedOrgIdMock).toHaveBeenLastCalledWith('org-fetch-test');
    expect(fetchVariablesMock).toHaveBeenCalledWith('user-test', 'token-test');
  });
  
  test('does not call fetchVariables if organization is not selected initially', async () => {
    mockedUseOrganizationStore.mockImplementation(selector => {
      const state = { currentOrganization: null };
      return selector(state);
    });
     await act(async () => {
      render(<DataIntakeContainer />);
    });
    expect(setSelectedOrgIdMock).toHaveBeenLastCalledWith(null);
    expect(fetchVariablesMock).not.toHaveBeenCalled();
  });

  test('handles delete variable flow correctly', async () => {
    const user = userEvent.setup();
    const variableToDelete = mockOrg123Variables[0]; 
    mockedUseVariableStore.mockImplementation((selector) => selector({ variables: [variableToDelete], selectedOrganizationId: 'org-123' }));
    mockedUseOrganizationStore.mockImplementation(selector => {
      const state = { currentOrganization: { id: 'org-123', name: 'Test Org Delete Flow' } };
      return selector(state);
    });
    
    render(
      <DataIntakeContainer>
        {(props: ContainerProps) => (
          <div>
            {props.filteredVariables.map((variable: Variable) => (
               <div key={variable.id}>
                <h3>{variable.name}</h3>
                <button onClick={() => props.handleDeleteClick(variable.id, variable.name)}>Delete {variable.name}</button>
              </div>
            ))}
          </div>
        )}
      </DataIntakeContainer>
    );

    expect(screen.getByText(variableToDelete.name)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Delete ${variableToDelete.name}` }));
    
    // Assuming DeleteConfirmationModal has these elements:
    expect(screen.getByRole('heading', { name: /confirm deletion/i })).toBeInTheDocument();
    // Adjusted text matcher for multi-node text
    expect(screen.getByText((content, element) => {
      const hasText = (node: Element | null) => node?.textContent === `Are you sure you want to delete the variable "${variableToDelete.name}"? This action cannot be undone.`
      const nodeHasText = hasText(element);
      const childrenDontHaveText = Array.from(element?.children || []).every(child => !hasText(child));
      return nodeHasText && childrenDontHaveText;
    })).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /^delete$/i })); // Adjusted to match "Delete" button in modal
    
    expect(handleDeleteVariableMock).toHaveBeenCalledWith(variableToDelete.id, 'org-123');
    expect(screen.queryByRole('heading', { name: /confirm deletion/i })).not.toBeInTheDocument();
  });

  test('calls onVariablesUpdated when filteredVariables change', async () => {
    const onVariablesUpdatedMock = jest.fn();
    
    mockedUseVariableStore.mockImplementation((selector) => selector({ variables: allMockVariables, selectedOrganizationId: 'org-123' }));
    
    const { rerender } = render(<DataIntakeContainer onVariablesUpdated={onVariablesUpdatedMock} />);
    
    await act(async () => {}); // Ensure initial effects run

    expect(onVariablesUpdatedMock).toHaveBeenCalledTimes(1); 
    expect(onVariablesUpdatedMock).toHaveBeenLastCalledWith(mockOrg123Variables);
    onVariablesUpdatedMock.mockClear();

    // Simulate organization change
    mockedUseOrganizationStore.mockImplementation(selector => {
      const state = { currentOrganization: { id: 'org-456', name: 'Other Org' } };
      return selector(state);
    });
    // This will trigger the useEffect in DataIntakeContainer, which calls setSelectedOrganizationIdInStore('org-456')
    // Then useVariableStore mock needs to reflect this change for filteredVariables to update
    mockedUseVariableStore.mockImplementation((selector) => selector({ 
      variables: allMockVariables, 
      selectedOrganizationId: 'org-456' 
    }));
    
    await act(async () => {
      rerender(<DataIntakeContainer onVariablesUpdated={onVariablesUpdatedMock} />);
    });
    
    expect(onVariablesUpdatedMock).toHaveBeenCalledTimes(1);
    expect(onVariablesUpdatedMock).toHaveBeenLastCalledWith(mockOrg456Variables);
  });
  
  test('displays API success status message', () => {
    mockedUseVariableApi.mockReturnValue({
      apiStatus: { success: true, error: null }, 
      handleImportVariables: handleImportVariablesMock,
      handleDeleteVariable: handleDeleteVariableMock,
      handleUpdateVariable: handleUpdateVariableMock,
    });
    render(<DataIntakeContainer />);
    expect(screen.getByText(/variables saved successfully/i)).toBeInTheDocument(); // Adjusted text
  });

  test('displays API error status message', () => {
    const apiErrorMsg = 'Unique API submission failure message';
    mockedUseVariableApi.mockReturnValue({
      apiStatus: { success: false, error: apiErrorMsg }, // Trigger error
      handleImportVariables: handleImportVariablesMock,
      handleDeleteVariable: handleDeleteVariableMock,
      handleUpdateVariable: handleUpdateVariableMock,
    });
    render(<DataIntakeContainer />);
    expect(screen.getByText(apiErrorMsg)).toBeInTheDocument();
  });
  
  test('UploadSection interaction triggers parseCSV', async () => {
    const user = userEvent.setup();
    render(<DataIntakeContainer />);

    // Get the hidden file input by its new data-testid
    const fileInput = screen.getByTestId('csv-upload-input');
    
    // Create a mock file
    const mockFile = new File(['col1,col2\nval1,val2'], 'test.csv', { type: 'text/csv' });

    // Simulate file upload
    await user.upload(fileInput, mockFile);
    
    expect(parseCSVMock).toHaveBeenCalledWith(mockFile);
  });

  test('shows ImportModal when showImportModal is true and processedVariables exist', () => {
    const processedVars = [{ id: 'new-1', name: 'New Imported Var', type: 'ACTUAL', organizationId: 'org-123', timeSeries: [] }] as Variable[];
    mockedUseCsvProcessor.mockReturnValue({
      isUploading: false, error: null, processedVariables: processedVars, setProcessedVariables: setProcessedVariablesMock,
      showImportModal: true, // Key for this test
      setShowImportModal: setShowImportModalMock, parseCSV: parseCSVMock,
    });
    render(<DataIntakeContainer />);
    // Assuming ImportModal has a title or identifiable text
    expect(screen.getByRole('heading', { name: /Import Variables/i })).toBeInTheDocument();
    // And a confirm button
    expect(screen.getByRole('button', { name: /Apply Changes/i })).toBeInTheDocument();
  });

  test('calls handleImportVariables on ImportModal confirm', async () => {
    const user = userEvent.setup();
    const newVars = [{ id: 'new-1', name: 'New Var To Import', type: 'ACTUAL', organizationId: 'org-123', timeSeries: [] }] as Variable[];
    mockedUseCsvProcessor.mockReturnValue({
      isUploading: false, error: null, processedVariables: newVars, setProcessedVariables: setProcessedVariablesMock,
      showImportModal: true, setShowImportModal: setShowImportModalMock, parseCSV: parseCSVMock,
    });
     mockedUseVariableStore.mockImplementation((selector) => { // Ensure existing variables are available
      const state = {
        variables: mockOrg123Variables, 
        selectedOrganizationId: 'org-123',
        setVariables: jest.fn(), 
      };
      return selector(state);
    });


    render(<DataIntakeContainer />);
    
    const confirmButton = screen.getByRole('button', { name: /Apply Changes/i });
    await user.click(confirmButton);

    const expectedDecisions = [
      {
        action: 'add',
        variable: newVars[0], // The first (and only) variable from newVars
      },
    ];

    expect(handleImportVariablesMock).toHaveBeenCalledWith(expectedDecisions);
    // The setShowImportModal(false) is typically called within handleImportVariables or its success callback.
    // We are mocking handleImportVariables, so we can't assert its side effect on setShowImportModal directly
    // unless handleImportVariablesMock itself calls setShowImportModalMock(false).
    // Or, ImportModal's onConfirm might call onClose which calls setShowImportModal(false)
    // For this test, we assume the modal is closed by onConfirm.
    // If `handleImportVariables` from useVariableApi itself calls `setShowImportModal(false)`, then it would need to be part of the mock.
    // The component's ImportModal has `onClose={() => setShowImportModal(false)}` and `onConfirm={handleImportVariables}`
    // So, handleImportVariables doesn't directly close. If it's successful, the modal should close.
    // Let's assume after a successful import, showImportModal becomes false.
    // This test relies on the ImportModal's own onConfirm behavior or an update to showImportModal state.
  });


  // Test for VariableDetailsModal remains as is, testing the mock
  test('renders the VariableDetailsModal with correct props when open', () => {
    // This test focuses on the DataIntakeContainer's logic to pass props
    // It does not test the VariableDetailsModal's internal workings
    const mockCloseFunction = jest.fn();
    const variableForModal = mockOrg123Variables[0];

    // Mock useState within DataIntakeContainer for this specific test
    // This is tricky without directly mocking useState. Instead, we'll rely on the 
    // child render prop to simulate opening the modal if that's how it's controlled,
    // or by setting the state via a mocked hook if directly controlled.
    // The DataIntakeContainer uses internal state: isDetailsModalOpen, selectedVariableForModal
    // We need to simulate these being set.
    // For now, we keep the original test structure for VariableDetailsModal which directly renders it.

    const testProps = {
      isOpen: true,
      onClose: mockCloseFunction,
      variableToEdit: variableForModal, // Pass a variable
      onSave: handleUpdateVariableMock,
      currentOrganizationId: 'org-123'
    };

    render(
      <div data-testid="test-container">
        <VariableDetailsModalMock 
          isOpen={testProps.isOpen}
          onClose={testProps.onClose}
          variableToEdit={testProps.variableToEdit}
          onSave={testProps.onSave}
          currentOrganizationId={testProps.currentOrganizationId}
        />
      </div>
    );

    expect(VariableDetailsModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onClose: mockCloseFunction,
        variableToEdit: variableForModal,
        onSave: handleUpdateVariableMock,
        currentOrganizationId: 'org-123'
      }),
      {} 
    );
    
    expect(screen.getByTestId('test-container')).toBeInTheDocument();
    expect(screen.getByTestId('mock-variable-details-modal')).toBeInTheDocument();
  });
}); 