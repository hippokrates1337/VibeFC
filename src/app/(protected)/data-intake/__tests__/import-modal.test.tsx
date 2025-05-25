import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ImportModal, type ImportAction, type VariableImportDecision } from '../import-modal';

// Mock scrollIntoView for Radix UI components in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('ImportModal Component Integration Tests', () => {
  // Sample test data
  const mockNewVariables = [
    {
      id: '1',
      name: 'New Revenue',
      type: 'ACTUAL' as const,
      organizationId: 'org-1',
      timeSeries: [
        { date: new Date('2023-01-01'), value: 1000 },
        { date: new Date('2023-02-01'), value: 1200 },
      ]
    },
    {
      id: '2',
      name: 'New Expenses',
      type: 'BUDGET' as const,
      organizationId: 'org-1',
      timeSeries: [
        { date: new Date('2023-01-01'), value: 800 },
        { date: new Date('2023-03-01'), value: 850 },
      ]
    }
  ];
  
  const mockExistingVariables = [
    {
      id: 'existing-1',
      name: 'Existing Revenue',
      type: 'ACTUAL' as const,
      organizationId: 'org-1',
      timeSeries: [
        { date: new Date('2023-01-01'), value: 900 },
      ]
    },
    {
      id: 'existing-2',
      name: 'Existing Expenses',
      type: 'BUDGET' as const,
      organizationId: 'org-1',
      timeSeries: [
        { date: new Date('2023-01-01'), value: 700 },
      ]
    }
  ];
  
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    newVariables: mockNewVariables,
    existingVariables: mockExistingVariables,
    onConfirm: jest.fn(),
  };
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders correctly when open and displays variable names', () => {
    render(<ImportModal {...mockProps} />);

    // Use accessible role and name for the dialog
    expect(screen.getByRole('dialog', { name: /import variables/i })).toBeInTheDocument();

    // Check if variables from CSV are displayed by their text content
    expect(screen.getByText('New Revenue')).toBeInTheDocument();
    expect(screen.getByText('New Expenses')).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(<ImportModal {...mockProps} isOpen={false} />);

    // Use queryByRole which returns null if not found
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders variable rows with correct test ids', () => {
    render(<ImportModal {...mockProps} />);

    // Check that variable rows are rendered with correct test ids
    expect(screen.getByTestId('variable-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('variable-row-1')).toBeInTheDocument();
  });

  test('renders action select dropdowns for each variable', () => {
    render(<ImportModal {...mockProps} />);

    // Check that action select dropdowns are present
    const actionSelects = screen.getAllByRole('combobox', { name: /action for variable/i });
    expect(actionSelects).toHaveLength(2);
  });

  test('confirms with default "add" decisions if no changes are made', async () => {
    const user = userEvent.setup();
    render(<ImportModal {...mockProps} />);

    // Directly click the main confirm button without changing any actions
    const confirmButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(confirmButton);

    // --- Assertions ---
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
    const actualDecisions = mockProps.onConfirm.mock.calls[0][0];

    const expectedDecisions: VariableImportDecision[] = [
      { variable: mockNewVariables[0], action: 'add', replaceId: undefined },
      { variable: mockNewVariables[1], action: 'add', replaceId: undefined }
    ];

    expect(actualDecisions).toEqual(expectedDecisions);
  });

  test('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportModal {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    expect(mockProps.onConfirm).not.toHaveBeenCalled();
  });

  test('calls onClose when close icon/button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportModal {...mockProps} />);

    const closeButton = screen.getByRole('button', { name: /close import modal/i }); 
    await user.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    expect(mockProps.onConfirm).not.toHaveBeenCalled();
  });

  test('displays correct variable count in footer', () => {
    render(<ImportModal {...mockProps} />);

    expect(screen.getByText('2 variables selected')).toBeInTheDocument();
  });

  test('renders variable type badges correctly', () => {
    render(<ImportModal {...mockProps} />);

    expect(screen.getByText('ACTUAL')).toBeInTheDocument();
    expect(screen.getByText('BUDGET')).toBeInTheDocument();
  });
}); 