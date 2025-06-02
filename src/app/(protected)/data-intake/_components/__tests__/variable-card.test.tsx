import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import '@testing-library/jest-dom';
import { VariableCard } from '../variable-card';
import { Variable } from '@/lib/store/variables';

describe('VariableCard', () => {
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
      <VariableCard 
        variable={mockVariable} 
        onDelete={mockOnDelete} 
        onViewDetails={mockOnViewDetails} 
      />
    );

    expect(screen.getByText('Test Variable')).toBeInTheDocument();
    expect(screen.getByText(/Type: ACTUAL/)).toBeInTheDocument();
    expect(screen.getByText(/3 data points/)).toBeInTheDocument();
    expect(screen.getByText(/01\/2023 - 03\/2023/)).toBeInTheDocument();
  });

  test('calls onDelete when delete button is clicked', () => {
    render(
      <VariableCard 
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

  test('calls onViewDetails when card is clicked', () => {
    render(
      <VariableCard 
        variable={mockVariable} 
        onDelete={mockOnDelete} 
        onViewDetails={mockOnViewDetails} 
      />
    );

    // Click on the card but not on the delete button
    const card = screen.getByText('Test Variable').closest('div');
    if (card) {
      fireEvent.click(card);
    }

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockVariable);
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  test('renders correctly with no time series data', () => {
    const emptyVariable: Variable = {
      ...mockVariable,
      timeSeries: []
    };

    render(
      <VariableCard 
        variable={emptyVariable} 
        onDelete={mockOnDelete} 
        onViewDetails={mockOnViewDetails} 
      />
    );

    expect(screen.getByText('Test Variable')).toBeInTheDocument();
    expect(screen.getByText(/Type: ACTUAL/)).toBeInTheDocument();
    expect(screen.getByText(/0 data points/)).toBeInTheDocument();
    expect(screen.getByText('No time series data')).toBeInTheDocument();
  });
}); 