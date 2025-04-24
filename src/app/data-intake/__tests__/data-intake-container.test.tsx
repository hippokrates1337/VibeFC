import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataIntakeContainer } from '../_components/data-intake-container';
import { useVariableStore } from '@/lib/store/variables';

// Mock the Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading Icon</div>
}));

// Mock the store
jest.mock('@/lib/store/variables', () => ({
  useVariableStore: jest.fn(),
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

// Mock the UI components
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>,
}));

describe('DataIntakeContainer', () => {
  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('displays loading state when isLoading is true', () => {
    // Setup mock store state
    (useVariableStore as unknown as jest.Mock).mockReturnValue({
      variables: [],
      isLoading: true,
      error: null,
      fetchVariables: jest.fn(),
    });

    render(<DataIntakeContainer />);
    
    // Check if loading indicator is displayed
    expect(screen.getByText(/loading variables/i)).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });
  
  test('displays error state when there is an error', () => {
    const errorMessage = 'Failed to fetch variables';
    
    // Setup mock store state with error
    (useVariableStore as unknown as jest.Mock).mockReturnValue({
      variables: [],
      isLoading: false,
      error: errorMessage,
      fetchVariables: jest.fn(),
    });

    render(<DataIntakeContainer />);
    
    // Check if error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByTestId('mock-upload-section')).toBeInTheDocument();
  });
  
  test('displays empty state when there are no variables', () => {
    // Setup mock store state with no variables
    (useVariableStore as unknown as jest.Mock).mockReturnValue({
      variables: [],
      isLoading: false,
      error: null,
      fetchVariables: jest.fn(),
      setVariables: jest.fn(),
    });

    render(<DataIntakeContainer />);
    
    // Check if empty state message is displayed
    expect(screen.getByText(/no variables found/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-upload-section')).toBeInTheDocument();
  });
  
  test('displays data table when variables exist', () => {
    // Setup mock variables
    const mockVariables = [
      {
        id: '1',
        name: 'Variable 1',
        type: 'ACTUAL',
        timeSeries: [{ date: new Date('2023-01-01'), value: 100 }]
      },
      {
        id: '2',
        name: 'Variable 2',
        type: 'BUDGET',
        timeSeries: [{ date: new Date('2023-01-01'), value: 200 }]
      }
    ];
    
    // Setup mock store state with variables
    (useVariableStore as unknown as jest.Mock).mockReturnValue({
      variables: mockVariables,
      isLoading: false,
      error: null,
      fetchVariables: jest.fn(),
      setVariables: jest.fn(),
    });

    render(<DataIntakeContainer />);
    
    // Check if data table is displayed
    expect(screen.getByTestId('mock-data-table')).toBeInTheDocument();
    expect(screen.queryByText(/no variables found/i)).not.toBeInTheDocument();
  });
}); 