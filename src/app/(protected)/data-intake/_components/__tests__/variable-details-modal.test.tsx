import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import '@testing-library/jest-dom';
import { VariableDetailsModal } from '../variable-details-modal';
import { Variable, TimeSeriesData } from '@/lib/store/variables';

// Define types for component props
interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface VariableDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  variableToEdit: Variable | null;
  onSave: (variableId: string, updateData: any, organizationId: string | null) => Promise<void>;
  currentOrganizationId: string | null;
}

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  children: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  onSelect?: () => void;
}

interface TimeSeriesPoint {
  date: Date | string;
  value: number;
}

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="mock-x-icon">X</div>
}));

// Mock the Dialog component and other UI components
jest.mock('@/components/ui/dialog', () => {
  return {
    Dialog: function Dialog(props: DialogProps) {
      const { children, open, onOpenChange } = props;
      return open ? <div data-testid="mock-dialog">{children}</div> : null;
    },
    DialogContent: function DialogContent(props: DialogContentProps) {
      const { children, className } = props;
      return <div data-testid="mock-dialog-content" className={className}>{children}</div>;
    },
    DialogHeader: function DialogHeader(props: DialogHeaderProps) {
      const { children } = props;
      return <div data-testid="mock-dialog-header">{children}</div>;
    },
    DialogTitle: function DialogTitle(props: DialogTitleProps) {
      const { children, className } = props;
      return <div data-testid="mock-dialog-title" className={className}>{children}</div>;
    },
    DialogFooter: function DialogFooter(props: DialogFooterProps) {
      const { children, className } = props;
      return <div data-testid="mock-dialog-footer" className={className}>{children}</div>;
    },
    DialogClose: function DialogClose(props: DialogCloseProps) {
      const { children, asChild } = props;
      return <div data-testid="mock-dialog-close">{children}</div>;
    }
  };
});

jest.mock('@/components/ui/input', () => {
  return {
    Input: jest.fn((props: InputProps) => {
      const { value, onChange, className, autoFocus, onKeyDown, ...rest } = props;
      // Ensure 'data-testid' from the component is passed through, or default for direct query.
      const testId = rest["data-testid"] || "mock-input-actual"; 
      return (
        <input
          data-testid={testId}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className={className}
          autoFocus={autoFocus}
          {...rest}
        />
      );
    })
  };
});

jest.mock('@/components/ui/select', () => {
  const ActualSelect = jest.requireActual('@/components/ui/select');
  return {
    Select: jest.fn(({ children, value, onValueChange }) => (
      <div data-testid="mock-select-actual" data-value={value}>
        {children}
        {/* Helper to simulate value change for testing */}
        <button
          data-testid="mock-select-trigger-change"
          style={{ display: 'none' }}
          onClick={() => onValueChange && onValueChange('BUDGET')} // Example value
        >
          Trigger Change
        </button>
         <button
          data-testid="mock-select-trigger-change-to-actual"
          style={{ display: 'none' }}
          onClick={() => onValueChange && onValueChange('ACTUAL')} 
        >
          Trigger Change Actual
        </button>
        <button
          data-testid="mock-select-trigger-change-to-input"
          style={{ display: 'none' }}
          onClick={() => onValueChange && onValueChange('INPUT')} 
        >
          Trigger Change Input
        </button>
      </div>
    )),
    SelectTrigger: jest.fn(({ children, className }) => (
      <div data-testid="mock-select-trigger-actual" className={className}>{children}</div>
    )),
    SelectValue: jest.fn(({ placeholder }) => ( // Use placeholder if needed
      <div data-testid="mock-select-value-actual">{placeholder}</div>
    )),
    SelectContent: jest.fn(({ children }) => (
      <div data-testid="mock-select-content-actual">{children}</div>
    )),
    SelectItem: jest.fn(({ children, value }) => ( // Removed onSelect for simplicity, actual clicks will be on parent
      <div data-testid={`mock-select-item-actual-${value}`}>{children}</div>
    )),
    // Keep other exports if VariableDetailsModal uses them, like SelectLabel, SelectGroup
  };
});

describe('VariableDetailsModal', () => {
  const mockVariable: Variable = {
    id: '123',
    name: 'Test Variable',
    type: 'ACTUAL',
    organizationId: 'org-123',
    timeSeries: [
      { date: new Date('2023-01-01'), value: 100 },
      { date: new Date('2023-02-01'), value: 200 },
    ]
  };

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSave.mockImplementation(() => Promise.resolve());
  });

  test('renders correctly when closed', () => {
    const { container } = render(
      <VariableDetailsModal
        isOpen={false}
        onClose={mockOnClose}
        variableToEdit={null}
        onSave={mockOnSave}
        currentOrganizationId={mockOrganizationId}
      />
    );
    
    // Modal should not be visible
    expect(container.firstChild).toBeNull();
  });

  test('renders correctly when open with variable data', () => {
    render(
      <VariableDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        variableToEdit={mockVariable}
        onSave={mockOnSave}
        currentOrganizationId={mockOrganizationId}
      />
    );
    
    // Modal container (from mock Dialog)
    expect(screen.getByTestId('mock-dialog')).toBeInTheDocument();
    expect(screen.getByText('Variable Details')).toBeInTheDocument(); // DialogTitle
    
    // Check for variable name using getByDisplayValue for the input field
    const nameInput = screen.getByDisplayValue('Test Variable');
    expect(nameInput).toBeInTheDocument();
    
    // Check for variable type - The mock Select uses data-value
    // This will depend on how SelectValue mock renders the value.
    // Let's assume SelectValue mock or the trigger will display the current value.
    // The parent div of our Select mock has `data-value`
    expect(screen.getByTestId('mock-select-actual')).toHaveAttribute('data-value', 'ACTUAL');

    // Check for time series data (dates are formatted 'MM/yyyy')
    expect(screen.getByText('01/2023')).toBeInTheDocument();
    // Values are locale string formatted, e.g., "100" or "1,000" if large. Let's assume simple numbers for mock.
    expect(screen.getByText('100')).toBeInTheDocument(); 
    expect(screen.getByText('02/2023')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  test('calls onClose when Cancel button is clicked', () => {
    render(
      <VariableDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        variableToEdit={mockVariable}
        onSave={mockOnSave}
        currentOrganizationId={mockOrganizationId}
      />
    );
    
    // Find and click the Cancel button by its text/role
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('calls onSave with only updated name when name is changed', async () => {
    render(
      <VariableDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        variableToEdit={mockVariable}
        onSave={mockOnSave}
        currentOrganizationId={mockOrganizationId}
      />
    );
    
    // Change the variable name
    const nameInput = screen.getByDisplayValue('Test Variable');
    fireEvent.change(nameInput, { target: { value: 'Updated Variable Name' } });
    
    // Click the Save Changes button
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        '123',
        { name: 'Updated Variable Name' }, // Only name should be in updateData
        'org-123'
      );
    });
  });

  test('calls onSave with only updated type when type is changed', async () => {
    render(
      <VariableDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        variableToEdit={mockVariable} // Initial type is ACTUAL
        onSave={mockOnSave}
        currentOrganizationId={mockOrganizationId}
      />
    );
    
    // Trigger the type change using our mock Select's helper button
    const changeTypeButton = screen.getByTestId('mock-select-trigger-change'); // This changes to BUDGET
    fireEvent.click(changeTypeButton);
    
    // Find and click the Save Changes button
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        '123',
        { type: 'BUDGET' }, // Only type should be in updateData
        'org-123'
      );
    });
  });

  test('does not call onSave if no changes are made', async () => {
    render(
      <VariableDetailsModal
        isOpen={true}
        onClose={mockOnClose}
        variableToEdit={mockVariable}
        onSave={mockOnSave}
        currentOrganizationId={mockOrganizationId}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    // Wait for a short period to ensure async operations (if any before save check) complete
    await new Promise(resolve => setTimeout(resolve, 50)); 

    expect(mockOnSave).not.toHaveBeenCalled();
    // onClose should be called because the component closes after "saving" (even if no API call)
    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('Time Series Editing', () => {
    const variableWithTimeSeries: Variable = {
      id: 'ts-var',
      name: 'Time Series Var',
      type: 'ACTUAL',
      organizationId: 'org-ts',
      timeSeries: [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-02-01'), value: 200 },
      ]
    };

    test('allows editing a time series value and saves it', async () => {
      render(
        <VariableDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          variableToEdit={variableWithTimeSeries}
          onSave={mockOnSave}
          currentOrganizationId={mockOrganizationId}
        />
      );

      // Find the display element for the first time series value (100)
      // The text is formatted with toLocaleString()
      const valueDisplay = screen.getByText(variableWithTimeSeries.timeSeries[0].value!.toLocaleString());
      fireEvent.click(valueDisplay);

      // An input field should now be visible for editing
      // The Input mock uses data-testid="mock-input-actual" by default
      // The autoFocus prop should make it the active element or we can find it by its current value.
      // The actual component uses a specific className for the time series input. Let's assume it's "w-24".
      // For now, let's find it by its current value, formatted by formatNumberForEdit
      const editInput = screen.getByDisplayValue(variableWithTimeSeries.timeSeries[0].value!.toString());
      expect(editInput).toHaveFocus();

      fireEvent.change(editInput, { target: { value: '150' } });
      
      // Find the confirm button (check icon)
      // The actual component uses an SVG. We can use `getByRole` if it has an accessible name, or a test-id if necessary.
      // Let's assume the confirm button is identifiable. The component uses a <svg> wrapped in a <button>.
      // The SVG has <title>Confirm</title> or similar or the button has aria-label.
      // The button has <span className="sr-only">Confirm</span>
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      // The display should update, though this is internal state before save.
      // The input field should disappear.
      expect(screen.queryByDisplayValue('150')).not.toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument(); // Updated value displayed

      // Click Save Changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          variableWithTimeSeries.id,
          { 
            timeSeries: [
              { date: new Date('2023-01-01'), value: 150 }, // Updated
              { date: new Date('2023-02-01'), value: 200 }, // Unchanged
            ]
          },
          mockOrganizationId
        );
      });
    });

    test('editing a time series value and pressing Enter confirms change', async () => {
      render(
        <VariableDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          variableToEdit={variableWithTimeSeries}
          onSave={mockOnSave}
          currentOrganizationId={mockOrganizationId}
        />
      );

      const valueDisplay = screen.getByText(variableWithTimeSeries.timeSeries[0].value!.toLocaleString());
      fireEvent.click(valueDisplay);
      const editInput = screen.getByDisplayValue(variableWithTimeSeries.timeSeries[0].value!.toString());
      
      fireEvent.change(editInput, { target: { value: '180' } });
      fireEvent.keyDown(editInput, { key: 'Enter', code: 'Enter' });

      expect(screen.queryByDisplayValue('180')).not.toBeInTheDocument();
      expect(screen.getByText('180')).toBeInTheDocument();

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          variableWithTimeSeries.id,
          { 
            timeSeries: [
              { date: new Date('2023-01-01'), value: 180 },
              { date: new Date('2023-02-01'), value: 200 },
            ]
          },
          mockOrganizationId
        );
      });
    });

    test('editing a time series value and pressing Escape cancels change', async () => {
      render(
        <VariableDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          variableToEdit={variableWithTimeSeries}
          onSave={mockOnSave}
          currentOrganizationId={mockOrganizationId}
        />
      );

      const originalValue = variableWithTimeSeries.timeSeries[0].value!;
      const valueDisplay = screen.getByText(originalValue.toLocaleString());
      fireEvent.click(valueDisplay);
      const editInput = screen.getByDisplayValue(originalValue.toString());
      
      fireEvent.change(editInput, { target: { value: '999' } }); // Tentative change
      fireEvent.keyDown(editInput, { key: 'Escape', code: 'Escape' });

      // Input should disappear, value should revert
      expect(screen.queryByDisplayValue('999')).not.toBeInTheDocument();
      expect(screen.getByText(originalValue.toLocaleString())).toBeInTheDocument();

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // onSave should not be called as no effective change was made to be saved by this action.
      // The component will close, so onClose will be called.
      await new Promise(resolve => setTimeout(resolve, 50)); 
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

     test('handles null value input for time series correctly', async () => {
      render(
        <VariableDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          variableToEdit={variableWithTimeSeries}
          onSave={mockOnSave}
          currentOrganizationId={mockOrganizationId}
        />
      );

      const valueDisplay = screen.getByText(variableWithTimeSeries.timeSeries[0].value!.toLocaleString());
      fireEvent.click(valueDisplay);
      const editInput = screen.getByDisplayValue(variableWithTimeSeries.timeSeries[0].value!.toString());

      fireEvent.change(editInput, { target: { value: '' } }); // Empty string, should parse to null
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(screen.getByText('-')).toBeInTheDocument(); // Display for null

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          variableWithTimeSeries.id,
          { 
            timeSeries: [
              { date: new Date('2023-01-01'), value: null }, // Value becomes null
              { date: new Date('2023-02-01'), value: 200 },
            ]
          },
          mockOrganizationId
        );
      });
    });

    test('handles invalid number input for time series by parsing to null', async () => {
      render(
        <VariableDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          variableToEdit={variableWithTimeSeries}
          onSave={mockOnSave}
          currentOrganizationId={mockOrganizationId}
        />
      );

      const valueDisplay = screen.getByText(variableWithTimeSeries.timeSeries[0].value!.toLocaleString());
      fireEvent.click(valueDisplay);
      const editInput = screen.getByDisplayValue(variableWithTimeSeries.timeSeries[0].value!.toString());

      fireEvent.change(editInput, { target: { value: 'invalid-text' } });
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(screen.getByText('-')).toBeInTheDocument(); // Display for null after invalid parse

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          variableWithTimeSeries.id,
          { 
            timeSeries: [
              { date: new Date('2023-01-01'), value: null }, // Value becomes null
              { date: new Date('2023-02-01'), value: 200 },
            ]
          },
          mockOrganizationId
        );
      });
    });

  });
}); 