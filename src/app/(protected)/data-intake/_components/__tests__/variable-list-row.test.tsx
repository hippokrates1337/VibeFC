import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import '@testing-library/jest-dom';
import { VariableListRow } from '../variable-list-row';
import { Variable } from '@/lib/store/variables';

describe('VariableListRow', () => {
  const mockVariable: Variable = {
    id: '123',
    name: 'Test Variable',
    type: 'ACTUAL',
    organizationId: 'org-123',
    timeSeries: [
      { date: new Date('2023-01-01'), value: 100 },
      { date: new Date('2023-02-01'), value: 200 },
      { date: new Date('2023-03-01'), value: 300 },
    ]
  };

  const mockOnDelete = jest.fn();
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders variable information correctly', () => {
    render(
      <VariableListRow
        variable={mockVariable}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Test Variable')).toBeInTheDocument();
    expect(screen.getByTestId('variable-item')).toHaveTextContent('ACTUAL');
    expect(screen.getByTestId('variable-item')).toHaveTextContent('3 data points');
    expect(screen.getByTestId('variable-item')).toHaveTextContent('01/2023');
    expect(screen.getByTestId('variable-item')).toHaveTextContent('03/2023');
  });

  test('calls onDelete when delete button is clicked', () => {
    render(
      <VariableListRow
        variable={mockVariable}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('123', 'Test Variable');
    expect(mockOnViewDetails).not.toHaveBeenCalled();
  });

  test('calls onViewDetails when row is clicked', () => {
    render(
      <VariableListRow
        variable={mockVariable}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    const row = screen.getByTestId('variable-item');
    fireEvent.click(row);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockVariable);
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  test('renders correctly with no time series data', () => {
    const emptyVariable: Variable = {
      ...mockVariable,
      timeSeries: []
    };

    render(
      <VariableListRow
        variable={emptyVariable}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Test Variable')).toBeInTheDocument();
    expect(screen.getByTestId('variable-item')).toHaveTextContent('No time series data');
    expect(screen.getByTestId('variable-item')).toHaveTextContent('0 data points');
  });
});
