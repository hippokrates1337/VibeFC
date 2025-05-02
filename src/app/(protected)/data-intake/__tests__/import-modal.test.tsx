import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
      timeSeries: [
        { date: new Date('2023-01-01'), value: 1000 },
        { date: new Date('2023-02-01'), value: 1200 },
      ]
    },
    {
      id: '2',
      name: 'New Expenses',
      type: 'BUDGET' as const,
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
      timeSeries: [
        { date: new Date('2023-01-01'), value: 900 },
      ]
    },
    {
      id: 'existing-2',
      name: 'Existing Expenses',
      type: 'BUDGET' as const,
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
    // You might add more specific checks here based on the actual component structure,
    // e.g., checking default action states if visible.
  });

  test('does not render when isOpen is false', () => {
    render(<ImportModal {...mockProps} isOpen={false} />);

    // Use queryByRole which returns null if not found
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Rewritten test focusing on user interaction flow
  // Mark test as async for findByRole
  test('allows changing action to "Update", selecting target, and confirms the final decisions', async () => {
    render(<ImportModal {...mockProps} />);

    // --- Interaction for the first variable ('New Revenue') ---
    const variableRow1 = screen.getByTestId('variable-row-0'); // Use index 0 for the first variable

    // --- Select 'Update' for the first variable ---
    // Find and click the trigger for the action select
    const actionSelectTrigger = within(variableRow1 as HTMLElement).getByRole('combobox', { name: /action for variable/i });
    fireEvent.click(actionSelectTrigger); // Click to open the dropdown

    // Find and click the 'Update Existing' option (use findByRole for potential async/portal rendering)
    const updateOption = await screen.findByRole('option', { name: /update existing/i });
    fireEvent.click(updateOption);

    // --- Select the target variable for replacement ---
    // Now the second select should be visible because the state updated
    // Find and click the trigger for the replacement target select
    // Use findByRole to wait for the element to appear after state update
    const replaceSelectTrigger = await within(variableRow1 as HTMLElement).findByRole('combobox', { name: /variable to update/i });
    fireEvent.click(replaceSelectTrigger); // Click to open the second dropdown

    // Find and click the desired existing variable option
    // Use findByRole for potential async/portal rendering
    const targetVariableOption = await screen.findByRole('option', { name: /existing revenue/i }); // Match the text of the target option
    fireEvent.click(targetVariableOption);

    // --- Interaction for the second variable ('New Expenses') ---
    // We don't interact with the second variable, so it should retain the default 'add' action.

    // --- Final Confirmation ---
    // Find and click the main confirm button using its visible text/accessible name
    const confirmButton = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(confirmButton);

    // --- Assertions ---
    // Check that onConfirm was called exactly once
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);

    // Get the actual decisions passed to onConfirm
    const actualDecisions = mockProps.onConfirm.mock.calls[0][0];

    // Define the expected decisions array based on the interactions performed
    const expectedDecisions: VariableImportDecision[] = [
      { variable: mockNewVariables[0], action: 'update', replaceId: mockExistingVariables[0].id },
      { variable: mockNewVariables[1], action: 'add', replaceId: undefined } // Second variable defaults to 'add'
    ];

    // Assert that the actual decisions match the expected ones
    expect(actualDecisions).toEqual(expectedDecisions);
  });

  // Rewritten test for the 'skip' action
  // Mark test as async for findByRole
  test('allows changing action to "Skip" and confirms the final decisions', async () => {
    render(<ImportModal {...mockProps} />);

    // --- Interaction for the first variable ('New Revenue') ---
    const variableRow1 = screen.getByTestId('variable-row-0'); // Use index 0 for the first variable

    // --- Select 'Skip' for the first variable ---
    // Find and click the trigger for the action select
    const actionSelectTrigger = within(variableRow1 as HTMLElement).getByRole('combobox', { name: /action for variable/i });
    fireEvent.click(actionSelectTrigger);

    // Find and click the 'Skip' option (use findByRole)
    const skipOption = await screen.findByRole('option', { name: /skip/i });
    fireEvent.click(skipOption);

    // --- Final Confirmation ---
    const confirmButton = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(confirmButton);

    // --- Assertions ---
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
    const actualDecisions = mockProps.onConfirm.mock.calls[0][0];

    const expectedDecisions: VariableImportDecision[] = [
      { variable: mockNewVariables[0], action: 'skip', replaceId: undefined }, // First variable is skipped
      { variable: mockNewVariables[1], action: 'add', replaceId: undefined }  // Second variable defaults to 'add'
    ];

    expect(actualDecisions).toEqual(expectedDecisions);
  });

  // Rewritten test for confirming default state
  test('confirms with default "add" decisions if no changes are made', () => {
    render(<ImportModal {...mockProps} />);

    // Directly click the main confirm button without changing any actions
    const confirmButton = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(confirmButton);

    // --- Assertions ---
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
    const actualDecisions = mockProps.onConfirm.mock.calls[0][0];

    // Define the expected default decisions (all 'add')
    const expectedDecisions: VariableImportDecision[] = [
      { variable: mockNewVariables[0], action: 'add', replaceId: undefined },
      { variable: mockNewVariables[1], action: 'add', replaceId: undefined }
    ];

    expect(actualDecisions).toEqual(expectedDecisions);
  });

  // Rewritten test for cancel button
  test('calls onClose when Cancel button is clicked', () => {
    render(<ImportModal {...mockProps} />);

    // Find the Cancel button by its role and accessible name
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Check that onClose was called
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    // Ensure onConfirm was NOT called
    expect(mockProps.onConfirm).not.toHaveBeenCalled();
  });

  // Rewritten test for close icon/button
  test('calls onClose when close icon/button is clicked', () => {
    render(<ImportModal {...mockProps} />);

    // Find the close button. Assuming it has an accessible name like "Close" or an aria-label.
    // Adjust the selector based on the actual implementation.
    const closeButton = screen.getByRole('button', { name: /close import modal/i }); 
    fireEvent.click(closeButton);

    // Check that onClose was called
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    // Ensure onConfirm was NOT called
    expect(mockProps.onConfirm).not.toHaveBeenCalled();
  });
}); 