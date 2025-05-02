import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataTable } from '../../_components/data-table';
import { useVariableStore, type Variable, type TimeSeriesData } from '@/lib/store/variables';

// Mock the store
jest.mock('@/lib/store/variables', () => ({
  useVariableStore: jest.fn(() => ({
    setVariables: jest.fn(),
  })),
}));

// Mock scrollIntoView for Radix UI components (like Select) in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('DataTable Component', () => {
  // Sample test data
  const mockDates = [
    new Date('2023-01-01'),
    new Date('2023-02-01'),
    new Date('2023-03-01')
  ];
  
  const mockVariables = [
    {
      id: '1',
      name: 'Revenue',
      type: 'ACTUAL' as const,
      timeSeries: [
        { date: new Date('2023-01-01'), value: 1000 },
        { date: new Date('2023-02-01'), value: 1200 },
      ]
    },
    {
      id: '2',
      name: 'Expenses',
      type: 'BUDGET' as const,
      timeSeries: [
        { date: new Date('2023-01-01'), value: 800 },
        { date: new Date('2023-03-01'), value: 850 },
      ]
    }
  ];
  
  const mockHandlers = {
    onDeleteClick: jest.fn(),
    onUpdateVariable: jest.fn().mockResolvedValue(undefined),
  };
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // You might need to reset the store mock state here if it carries state between tests
    (useVariableStore() as any).setVariables.mockClear(); 
  });
  
  test('renders the data table with correct variables and dates', () => {
    render(
      <DataTable 
        variables={mockVariables}
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );
    
    // Check heading
    expect(screen.getByText('Uploaded Data')).toBeInTheDocument();
    
    // Check table headers
    expect(screen.getByRole('columnheader', { name: 'Variable' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    // Check for date headers using the actual rendered format (MM-YYYY)
    expect(screen.getByRole('columnheader', { name: '01-2023' })).toBeInTheDocument(); 
    expect(screen.getByRole('columnheader', { name: '02-2023' })).toBeInTheDocument(); 
    expect(screen.getByRole('columnheader', { name: '03-2023' })).toBeInTheDocument(); 

    // Check variable names within table rows
    const rows = screen.getAllByRole('row'); // Includes header row
    expect(rows).toHaveLength(mockVariables.length + 1); 
    expect(within(rows[1]).getByText('Revenue')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Expenses')).toBeInTheDocument();

    // Check some data points using the formatted values
    expect(within(rows[1]).getByText('1,000.0')).toBeInTheDocument(); 
    expect(within(rows[2]).getByText('850.0')).toBeInTheDocument(); 

  });
  
  test('displays initial variable types correctly using Select component', () => {
    render(
      <DataTable 
        variables={mockVariables}
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );
    
    const rows = screen.getAllByRole('row');
    // NOTE: Assumes the SelectTrigger has an accessible name or contains the value text.
    // Add aria-label="Select type for Revenue" to the SelectTrigger in DataTable for robustness.
    const selectTrigger1 = within(rows[1]).getByRole('combobox', { name: /select type for revenue/i });
    const selectTrigger2 = within(rows[2]).getByRole('combobox', { name: /select type for expenses/i });

    expect(selectTrigger1).toHaveTextContent('ACTUAL');
    expect(selectTrigger2).toHaveTextContent('BUDGET');
  });
  
  test('calls onDeleteClick when delete button is clicked', async () => {
    render(
      <DataTable 
        variables={mockVariables}
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );
    
    const rows = screen.getAllByRole('row');
    // NOTE: Assumes the delete button has an accessible name.
    // Add aria-label="Delete Revenue" to the button in DataTable for robustness.
    const deleteButton1 = within(rows[1]).getByRole('button', { name: /delete revenue/i });
    
    fireEvent.click(deleteButton1);
    
    // Check if the onDeleteClick handler was called with correct parameters
    expect(mockHandlers.onDeleteClick).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onDeleteClick).toHaveBeenCalledWith('1', 'Revenue');
  });
  
  test('allows editing and confirming variable name', async () => {
    // Maintain a mutable copy of variables for simulating prop updates
    let currentVariables = JSON.parse(JSON.stringify(mockVariables)); // Deep copy
    
    // Convert dates back to Date objects *immediately* after deep copy (using imperative loops)
    for (const variable of currentVariables) {
      if (variable.timeSeries) {
        for (const ts of variable.timeSeries) {
          // Check if ts and ts.date exist and if ts.date is a string before converting
          if (ts && ts.date && typeof ts.date === 'string') {
            ts.date = new Date(ts.date);
          } else if (ts && ts.date && !(ts.date instanceof Date)) {
            // Optional: Log if it's neither string nor Date (unexpected)
            console.warn('Unexpected date type found after JSON parse:', ts.date);
            // Handle potential invalid date objects if necessary, e.g., set to null
          }
        }
      }
    }
    
    // Define the mock handler - It just updates the state and fixes dates
    mockHandlers.onUpdateVariable.mockImplementation(async (variableId, updateData) => {
      const updatedVariables = currentVariables.map((v: Variable) => { 
        if (v.id === variableId) {
          return { ...v, ...updateData };
        } else {
          return v;
        }
      });
      // Ensure dates are Date objects (still needed here in case updateData includes dates)
      currentVariables = updatedVariables.map((v: Variable) => ({
        ...v,
        timeSeries: v.timeSeries.map((ts: TimeSeriesData) => ({
          ...ts,
          date: typeof ts.date === 'string' ? new Date(ts.date) : ts.date
        }))
      }));
      return Promise.resolve();
    });

    // Initial render and get rerender function
    const { rerender } = render(
      <DataTable 
        variables={currentVariables} // Start with initial variables
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );
    
    const rows = screen.getAllByRole('row');
    const revenueRow = rows[1];

    // NOTE: Assumes edit button has accessible name "Edit name for Revenue"
    const editButton = within(revenueRow).getByRole('button', { name: /edit revenue/i });
    fireEvent.click(editButton);
    
    // NOTE: Assumes input field gets an accessible name
    const inputField = await within(revenueRow).findByRole('textbox', { name: /edit variable name/i });
    expect(inputField).toHaveValue('Revenue');
    
    // Edit the name
    fireEvent.change(inputField, { target: { value: 'Updated Revenue' } });
    expect(inputField).toHaveValue('Updated Revenue');

    // NOTE: Assumes confirm button has accessible name "Confirm name change"
    const confirmButton = within(revenueRow).getByRole('button', { name: /confirm name change/i });
    fireEvent.click(confirmButton);
    
    // Check if the onUpdateVariable handler was called
    // (This ensures the mockImplementation updated currentVariables)
    expect(mockHandlers.onUpdateVariable).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onUpdateVariable).toHaveBeenCalledWith('1', { name: 'Updated Revenue' });

    // --- Manually re-render with the updated state ---
    rerender(
      <DataTable 
        variables={currentVariables} // Pass the updated variables
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );

    // --- Check if the UI updated after rerender ---
    await waitFor(() => {
      // Input should disappear
      expect(within(revenueRow).queryByRole('textbox')).not.toBeInTheDocument();
    });
    // New text should be present
    expect(within(revenueRow).getByText('Updated Revenue')).toBeInTheDocument(); 
  });
  
  test('cancels name editing when cancel button is clicked', async () => {
    render(
      <DataTable 
        variables={mockVariables}
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );
    
    const rows = screen.getAllByRole('row');
    const revenueRow = rows[1];

    // NOTE: Assumes edit button has accessible name "Edit name for Revenue"
    const editButton = within(revenueRow).getByRole('button', { name: /edit revenue/i });
    fireEvent.click(editButton);
    
    // NOTE: Assumes input field gets an accessible name
    const inputField = await within(revenueRow).findByRole('textbox', { name: /edit variable name/i });
    fireEvent.change(inputField, { target: { value: 'Attempted Update' } });
    
    // NOTE: Assumes cancel button has accessible name "Cancel name change"
    const cancelButton = within(revenueRow).getByRole('button', { name: /cancel name change/i });
    fireEvent.click(cancelButton);
    
    // Check that onUpdateVariable was not called
    expect(mockHandlers.onUpdateVariable).not.toHaveBeenCalled();
    
    // Check that the component went back to display mode with original name
    await waitFor(() => {
      expect(within(revenueRow).queryByRole('textbox')).not.toBeInTheDocument();
    });
    expect(within(revenueRow).getByText('Revenue')).toBeInTheDocument();
    expect(within(revenueRow).queryByText('Attempted Update')).not.toBeInTheDocument();
  });
  
  test('changes variable type using Select interaction', async () => {
    // Maintain a mutable copy of variables for simulating prop updates
    let currentVariables = JSON.parse(JSON.stringify(mockVariables)); // Deep copy
    // Convert dates back to Date objects *immediately* after deep copy
    currentVariables = currentVariables.map((v: Variable) => ({
      ...v,
      timeSeries: v.timeSeries.map((ts: TimeSeriesData) => ({
        ...ts,
        date: new Date(ts.date) // Assume ts.date is string here
      }))
    }));

    // Define the mock handler - It just updates the state and fixes dates
    mockHandlers.onUpdateVariable.mockImplementation(async (variableId, updateData) => {
      const updatedVariables = currentVariables.map((v: Variable) => { 
        if (v.id === variableId) {
          return { ...v, ...updateData };
        } else {
          return v;
        }
      });
      // Ensure dates are Date objects (still needed here in case updateData includes dates)
      currentVariables = updatedVariables.map((v: Variable) => ({
        ...v,
        timeSeries: v.timeSeries.map((ts: TimeSeriesData) => ({
          ...ts,
          date: typeof ts.date === 'string' ? new Date(ts.date) : ts.date
        }))
      }));
      return Promise.resolve();
    });

    // Initial render and get rerender function
    const { rerender } = render(
      <DataTable 
        variables={currentVariables} // Start with initial variables
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );
    
    const rows = screen.getAllByRole('row');
    const revenueRow = rows[1];

    // --- Find and interact with the Select component ---
    const selectTrigger = within(revenueRow).getByRole('combobox', { name: /select type for revenue/i });
    fireEvent.click(selectTrigger);
    const optionInput = await screen.findByRole('option', { name: /INPUT/i });
    fireEvent.click(optionInput);
    
    // --- Assert the callback was called correctly ---
    // (This ensures the mockImplementation updated currentVariables)
    expect(mockHandlers.onUpdateVariable).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onUpdateVariable).toHaveBeenCalledWith('1', { type: 'INPUT' }); 

    // --- Manually re-render with the updated state ---
    rerender(
      <DataTable 
        variables={currentVariables} // Pass the updated variables
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );

    // --- Check if the trigger visually updated ---
    await waitFor(() => {
        // Now check the text content after manual rerender
        expect(selectTrigger).toHaveTextContent('INPUT');
    });
  });
  
  test('sorting functionality structure (no interaction test yet)', () => {
    render(
      <DataTable 
        variables={mockVariables}
        dates={mockDates}
        onDeleteClick={mockHandlers.onDeleteClick}
        onUpdateVariable={mockHandlers.onUpdateVariable}
      />
    );
    
    // This test just verifies column headers exist, not sorting interaction
    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.length).toBeGreaterThan(3); // Variable, Type, Actions + Dates
    expect(screen.getByRole('columnheader', { name: 'Variable' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    // Check for at least one date header as well
    // Use getAllByRole since multiple date headers match the pattern
    const dateHeaders = screen.getAllByRole('columnheader', { name: /\d{2}-\d{4}/i }); 
    expect(dateHeaders.length).toBeGreaterThan(0); // Ensure at least one date header exists
  });
}); 