import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import '@testing-library/jest-dom';
import { DeleteConfirmationModal } from '../delete-confirmation-modal';

// Mock scrollIntoView for Radix UI components in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('DeleteConfirmationModal Component', () => {
  // Sample test data
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    variableName: 'Test Variable',
    onConfirm: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders delete confirmation modal with correct variable name', () => {
    render(<DeleteConfirmationModal {...mockProps} />);

    // Check if the modal dialog is rendered with the correct accessible name (title)
    expect(screen.getByRole('dialog', { name: /confirm deletion/i })).toBeInTheDocument();

    // Check if the variable name is displayed correctly within the description
    // We look for text containing the variable name within the dialog
    const dialog = screen.getByRole('dialog', { name: /confirm deletion/i });
    // Check for description text separately if needed, or combine check
    expect(screen.getByText(/are you sure you want to delete the variable/i)).toBeInTheDocument();
    expect(screen.getByText(`"${mockProps.variableName}"`)).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(<DeleteConfirmationModal {...mockProps} isOpen={false} />);

    // Modal dialog should not be rendered
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('calls onClose when Cancel button is clicked', () => {
    render(<DeleteConfirmationModal {...mockProps} />);

    // Click the Cancel button using its accessible name
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Check that onClose was called
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);

    // Check that onConfirm was NOT called
    expect(mockProps.onConfirm).not.toHaveBeenCalled();
  });

  test('calls onConfirm and onClose when Delete button is clicked', () => {
    render(<DeleteConfirmationModal {...mockProps} />);

    // Click the Delete button using its accessible name
    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);

    // Check that both onConfirm and onClose were called
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close icon is clicked', () => {
    render(<DeleteConfirmationModal {...mockProps} />);

    // Find the close button using its accessible name ("close icon" based on aria-label)
    const closeButton = screen.getByRole('button', { name: /close icon/i });

    // Click the close icon button
    fireEvent.click(closeButton);

    // Check that onClose was called (it might be called twice due to Dialog's onOpenChange)
    expect(mockProps.onClose).toHaveBeenCalled();

    // Check that onConfirm was NOT called
    expect(mockProps.onConfirm).not.toHaveBeenCalled();
  });
}); 