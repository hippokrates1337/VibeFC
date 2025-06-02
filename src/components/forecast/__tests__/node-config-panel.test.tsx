import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';

// Mock the stores with proper implementations
const mockUpdateNodeData = jest.fn();
const mockDeleteNode = jest.fn();
const mockSetSelectedNodeId = jest.fn();

jest.mock('@/lib/store/forecast-graph-store', () => ({
  useForecastGraphStore: jest.fn((selector: any) => {
    const mockState = {
      selectedNodeId: 'test-node',
      nodes: [
        {
          id: 'test-node',
          type: 'DATA',
          data: { variableId: 'var1', offsetMonths: 3 },
          position: { x: 100, y: 100 },
        },
      ],
      updateNodeData: mockUpdateNodeData,
      deleteNode: mockDeleteNode,
      setSelectedNodeId: mockSetSelectedNodeId,
    };
    return selector(mockState);
  }),
}));

jest.mock('@/lib/store/variables', () => ({
  useVariableStore: jest.fn((selector: any) => {
    const mockState = {
      variables: [
        { id: 'var1', name: 'Test Variable 1', organizationId: 'org-1', type: 'ACTUAL' },
        { id: 'var2', name: 'Test Variable 2', organizationId: 'org-1', type: 'BUDGET' },
      ],
      selectedOrganizationId: 'org-1',
    };
    return selector(mockState);
  }),
}));

// Mock all UI components with functional implementations
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: any) => open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: any) => <h2 data-testid="sheet-title">{children}</h2>,
  SheetDescription: ({ children }: any) => <p data-testid="sheet-description">{children}</p>,
  SheetFooter: ({ children }: any) => <div data-testid="sheet-footer">{children}</div>,
  SheetClose: ({ children }: any) => <span data-testid="sheet-close">{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, type, id, ...props }: any) => (
    <input 
      onChange={onChange} 
      value={value} 
      type={type} 
      id={id}
      aria-label={id}
      {...props} 
    />
  )
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button onClick={() => onValueChange?.('test-value')}>Trigger Change</button>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children, id }: any) => <div data-testid="select-trigger" id={id}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div data-testid="alert" data-variant={variant}>{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
}));

jest.mock('@/components/ui/toggle', () => ({
  Toggle: ({ options, value, onValueChange }: any) => (
    <div data-testid="toggle">
      {options?.map((option: any) => (
        <button
          key={option.value}
          onClick={() => onValueChange?.(option.value)}
          data-active={value === option.value}
          aria-label={option.label}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}));

// Import after mocks
const NodeConfigPanel = require('../node-config-panel').default;

describe('NodeConfigPanel', () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default mock state for each test
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    useForecastGraphStore.mockImplementation((selector: any) => {
      const mockState = {
        selectedNodeId: 'test-node',
        nodes: [
          {
            id: 'test-node',
            type: 'DATA',
            data: { variableId: 'var1', offsetMonths: 3 },
            position: { x: 100, y: 100 },
          },
        ],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(mockState);
    });
    
    // Use fake timers for tests that need them
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Only run timer cleanup if fake timers are active
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers();
    }
    jest.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      React.createElement(NodeConfigPanel, { open: false, onOpenChange: jest.fn() })
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders DATA node configuration form', () => {
    render(
      React.createElement(NodeConfigPanel, { open: true, onOpenChange: jest.fn() })
    );
    
    expect(screen.getByText('Configure DATA Node')).toBeInTheDocument();
    expect(screen.getByLabelText('name')).toBeInTheDocument();
    expect(screen.getByLabelText('offsetMonths')).toBeInTheDocument();
  });

  it('renders METRIC node configuration form with toggle', () => {
    // Override mock for METRIC node
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    useForecastGraphStore.mockImplementation((selector: any) => {
      const mockState = {
        selectedNodeId: 'metric-node',
        nodes: [
          {
            id: 'metric-node',
            type: 'METRIC',
            data: { 
              label: 'Test Metric',
              budgetVariableId: 'var2',
              historicalVariableId: 'var1',
              useCalculated: false
            },
            position: { x: 100, y: 100 },
          },
        ],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(mockState);
    });

    render(
      React.createElement(NodeConfigPanel, { open: true, onOpenChange: jest.fn() })
    );
    
    expect(screen.getByText('Configure METRIC Node')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.getByTestId('toggle')).toBeInTheDocument();
    expect(screen.getByLabelText('Variable')).toBeInTheDocument();
    expect(screen.getByLabelText('Calculated')).toBeInTheDocument();
  });

  it('handles input changes with debounced updates', async () => {
    render(
      React.createElement(NodeConfigPanel, { open: true, onOpenChange: jest.fn() })
    );
    
    const offsetInput = screen.getByLabelText('offsetMonths');
    
    fireEvent.change(offsetInput, { target: { value: '5' } });
    
    // Fast-forward timers to trigger debounced update
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node', { offsetMonths: 5 });
    });
  });

  it('handles node deletion with confirmation', async () => {
    const onOpenChange = jest.fn();
    render(
      React.createElement(NodeConfigPanel, { open: true, onOpenChange })
    );
    
    // Click delete button
    const deleteButton = screen.getByText('Delete Node');
    await user.click(deleteButton);
    
    // Check confirmation appears
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    
    // Confirm deletion
    const confirmButton = screen.getByText('Delete');
    await user.click(confirmButton);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('test-node');
    expect(mockSetSelectedNodeId).toHaveBeenCalledWith(null);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes the panel when close button is clicked', async () => {
    const onOpenChange = jest.fn();
    render(
      React.createElement(NodeConfigPanel, { open: true, onOpenChange })
    );
    
    const closeButton = screen.getByText('Close');
    await user.click(closeButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toggles between Variable and Calculated mode for METRIC nodes', async () => {
    // Override mock for METRIC node
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    useForecastGraphStore.mockImplementation((selector: any) => {
      const mockState = {
        selectedNodeId: 'metric-node',
        nodes: [
          {
            id: 'metric-node',
            type: 'METRIC',
            data: { 
              label: 'Test Metric',
              budgetVariableId: 'var2',
              historicalVariableId: 'var1',
              useCalculated: false
            },
            position: { x: 100, y: 100 },
          },
        ],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(mockState);
    });

    render(
      React.createElement(NodeConfigPanel, { open: true, onOpenChange: jest.fn() })
    );
    
    // Click on Calculated button
    const calculatedButton = screen.getByLabelText('Calculated');
    await user.click(calculatedButton);
    
    // Fast-forward timers to trigger debounced update
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(mockUpdateNodeData).toHaveBeenCalledWith('metric-node', { useCalculated: true });
    });
  });

  it('renders nothing when no node is selected', () => {
    // Override mock for no selection
    const { useForecastGraphStore } = require('@/lib/store/forecast-graph-store');
    useForecastGraphStore.mockImplementation((selector: any) => {
      const mockState = {
        selectedNodeId: null,
        nodes: [],
        updateNodeData: mockUpdateNodeData,
        deleteNode: mockDeleteNode,
        setSelectedNodeId: mockSetSelectedNodeId,
      };
      return selector(mockState);
    });
    
    const { container } = render(
      React.createElement(NodeConfigPanel, { open: true, onOpenChange: jest.fn() })
    );
    
    expect(container.firstChild).toBeNull();
  });
}); 