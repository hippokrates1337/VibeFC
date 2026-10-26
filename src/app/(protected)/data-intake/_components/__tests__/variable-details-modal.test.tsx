import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { VariableDetailsModal } from '../variable-details-modal';
import type { Variable } from '@/lib/store/variables';

// Radix UI Select needs these in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.hasPointerCapture = jest.fn();
window.HTMLElement.prototype.releasePointerCapture = jest.fn();

const units: Variable = {
  id: 'var-1',
  name: 'Units',
  type: 'INPUT',
  organizationId: 'org-1',
  timeSeries: [
    { month: '2026-02', value: 110 },
    { month: '2026-01', value: 100 },
  ],
};

const renderModal = (overrides: Partial<React.ComponentProps<typeof VariableDetailsModal>> = {}) => {
  const props = {
    isOpen: true,
    onClose: jest.fn(),
    variableToEdit: units,
    onSave: jest.fn().mockResolvedValue(true),
    onCreate: jest.fn().mockResolvedValue(true),
    currentOrganizationId: 'org-1',
    ...overrides,
  };
  render(<VariableDetailsModal {...props} />);
  return props;
};

const rows = (): string[] => screen.getAllByRole('row').slice(1).map((row) => row.textContent ?? '');

describe('VariableDetailsModal', () => {
  test('lists the months in order', () => {
    renderModal();

    expect(screen.getByText('Variable details')).toBeInTheDocument();
    expect(screen.getByLabelText('Name:')).toHaveValue('Units');
    expect(rows()).toEqual(['01/2026100', '02/2026110']);
  });

  test('edits a value and saves the whole series (replace)', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(screen.getByRole('button', { name: '110' }));
    const input = screen.getByLabelText('value for 02/2026');
    await user.clear(input);
    await user.type(input, '111.5{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(
      'var-1',
      { timeSeries: [{ month: '2026-01', value: 100 }, { month: '2026-02', value: 111.5 }] },
      'org-1'
    ));
    expect(props.onClose).toHaveBeenCalled();
  });

  test('adds a month and removes another', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    fireEvent.change(screen.getByLabelText('new month'), { target: { value: '2026-03' } });
    await user.type(screen.getByLabelText('new value'), '120');
    await user.click(screen.getByRole('button', { name: /Add month/ }));
    await user.click(screen.getByRole('button', { name: 'remove 01/2026' }));

    expect(rows()).toEqual(['02/2026110', '03/2026120']);
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(
      'var-1',
      { timeSeries: [{ month: '2026-02', value: 110 }, { month: '2026-03', value: 120 }] },
      'org-1'
    ));
  });

  test('refuses a month that already has a value and input that is not a number', async () => {
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(screen.getByLabelText('new month'), { target: { value: '2026-01' } });
    await user.type(screen.getByLabelText('new value'), '5');
    await user.click(screen.getByRole('button', { name: /Add month/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('01/2026 already has a value');

    fireEvent.change(screen.getByLabelText('new month'), { target: { value: '2026-04' } });
    await user.clear(screen.getByLabelText('new value'));
    await user.type(screen.getByLabelText('new value'), 'abc');
    await user.click(screen.getByRole('button', { name: /Add month/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('"abc" is not a number');
    expect(rows()).toHaveLength(2);
  });

  test('saves only a changed name without touching the values', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.clear(screen.getByLabelText('Name:'));
    await user.type(screen.getByLabelText('Name:'), 'Units sold');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith('var-1', { name: 'Units sold' }, 'org-1'));
  });

  test('creates a new variable from an empty form', async () => {
    const user = userEvent.setup();
    const props = renderModal({ variableToEdit: null });

    expect(screen.getByText('New variable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create variable' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The variable needs a name.');

    await user.type(screen.getByLabelText('Name:'), '  Headcount ');
    fireEvent.change(screen.getByLabelText('new month'), { target: { value: '2026-01' } });
    await user.type(screen.getByLabelText('new value'), '12');
    await user.click(screen.getByRole('button', { name: /Add month/ }));
    await user.click(screen.getByRole('button', { name: 'Create variable' }));

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(
      { name: 'Headcount', type: 'INPUT', timeSeries: [{ month: '2026-01', value: 12 }] },
      'org-1'
    ));
    expect(props.onSave).not.toHaveBeenCalled();
  });

  test('stays open when saving fails', async () => {
    const user = userEvent.setup();
    const props = renderModal({ onSave: jest.fn().mockResolvedValue(false) });

    await user.clear(screen.getByLabelText('Name:'));
    await user.type(screen.getByLabelText('Name:'), 'Other');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
