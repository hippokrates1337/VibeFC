import React from 'react';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ImportModal } from '../import-modal';
import { parseVariablesCsv } from '../_components/csv-import';
import type { Variable } from '@/lib/store/variables';

// Opening a Radix Select inside the Radix Dialog recurses endlessly in JSDOM (two focus traps),
// so the select is replaced by a combobox whose options are always rendered
jest.mock('@/components/ui/select', () => {
  const React = require('react');
  const OnChange = React.createContext(() => {});
  return {
    Select: ({ children, onValueChange }: any) => <OnChange.Provider value={onValueChange}>{children}</OnChange.Provider>,
    SelectTrigger: ({ children, 'aria-label': label }: any) => <button type="button" role="combobox" aria-label={label}>{children}</button>,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children, value, disabled }: any) => {
      const onValueChange = React.useContext(OnChange);
      return <button type="button" role="option" disabled={disabled} onClick={() => onValueChange(value)}>{children}</button>;
    },
  };
});

const existingVariables: Variable[] = [
  { id: 'existing-units', name: 'Units', type: 'INPUT', organizationId: 'org-1', timeSeries: [{ month: '2026-01', value: 1 }] },
  { id: 'existing-cost', name: 'Cost', type: 'ACTUAL', organizationId: 'org-1', timeSeries: [] },
];

const renderModal = (csv: string, overrides: Partial<React.ComponentProps<typeof ImportModal>> = {}) => {
  const props = {
    isOpen: true,
    onClose: jest.fn(),
    fileName: 'data.csv',
    result: parseVariablesCsv(csv),
    onReparse: jest.fn(),
    existingVariables,
    onConfirm: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  const view = render(<ImportModal {...props} />);
  return { ...view, props };
};

describe('ImportModal', () => {
  test('shows each variable with its months and a value preview', () => {
    renderModal('Variable,Type,2026-01,2026-02\nRevenue,ACTUAL,1000,1200.5\n');

    expect(screen.getByText('Import variables')).toBeInTheDocument();
    expect(screen.getByText(/data\.csv · 1 variables · 2 months \(01\/2026 – 02\/2026\)/)).toBeInTheDocument();
    const row = screen.getByTestId('variable-row-0');
    expect(row).toHaveTextContent('Revenue');
    expect(row).toHaveTextContent('2 months · 01/2026 – 02/2026');
    // Values are shown in the browser's locale
    expect(row).toHaveTextContent(/01\/2026: 1[.,]000/);
  });

  test('updates a variable with the same name by default and imports the rest as new', async () => {
    const user = userEvent.setup();
    const { props } = renderModal('Variable,Type,2026-02\nunits,INPUT,110\nPrice,INPUT,10.5\n');

    expect(screen.getByTestId('import-summary')).toHaveTextContent('1 new · 1 update · 0 skip');
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(props.onConfirm).toHaveBeenCalledTimes(1));
    const decisions = (props.onConfirm as jest.Mock).mock.calls[0][0];
    expect(decisions.map((d: any) => `${d.variable.name}:${d.action}:${d.targetId ?? ''}`)).toEqual([
      'units:update:existing-units',
      'Price:add:',
    ]);
    expect(decisions[0].variable.points).toEqual([{ month: '2026-02', value: 110 }]);
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });

  test('blocks the import while the file has problems and lists them', () => {
    renderModal('Variable,Type,2026-01\nA,INPUT,abc\n');

    expect(screen.getByRole('alert')).toHaveTextContent('Row 2, column "2026-01": "abc" in "A" is not a number');
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  test('asks to confirm an ambiguous number format before importing', async () => {
    const user = userEvent.setup();
    renderModal('Variable;Type;2026-01\nX;INPUT;1.234\n');

    expect(screen.getByTestId('format-question')).toHaveTextContent('number format');
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'These formats are right' }));

    expect(screen.queryByTestId('format-question')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
  });

  test('re-reads the file when the user picks another number format', async () => {
    const user = userEvent.setup();
    const { props } = renderModal('Variable;Type;2026-01\nX;INPUT;1.234\n');

    await user.click(screen.getByRole('combobox', { name: 'number format' }));
    await user.click(await screen.findByRole('option', { name: /decimal point/ }));

    expect(props.onReparse).toHaveBeenCalledWith({ decimal: 'dot', dateOrder: 'DMY' });
  });

  test('keeps the dialog open when saving fails', async () => {
    const user = userEvent.setup();
    const { props } = renderModal('Variable,Type,2026-01\nNew,INPUT,1\n', { onConfirm: jest.fn().mockResolvedValue(false) });

    await user.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(props.onConfirm).toHaveBeenCalled());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test('renders nothing when closed', () => {
    renderModal('Variable,Type,2026-01\nNew,INPUT,1\n', { isOpen: false });

    expect(screen.queryByText('Import variables')).not.toBeInTheDocument();
  });
});
