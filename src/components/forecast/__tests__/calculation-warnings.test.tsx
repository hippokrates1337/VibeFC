import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CalculationWarnings } from '../calculation-warnings';
import type { ForecastNodeClient } from '@/lib/store/forecast-graph-store/types';

const nodes = [
  { id: 'd-1', type: 'DATA', data: { name: 'Leads' }, position: { x: 0, y: 0 } },
  { id: 'm-1', type: 'METRIC', data: { label: 'Revenue' }, position: { x: 0, y: 0 } },
] as unknown as ForecastNodeClient[];

describe('CalculationWarnings', () => {
  test('renders nothing without warnings', () => {
    const { container } = render(<CalculationWarnings warnings={[]} nodes={nodes} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('lists the engine messages and names the nodes of a missing variable', () => {
    render(
      <CalculationWarnings
        nodes={nodes}
        warnings={[
          { code: 'VARIABLE_NOT_FOUND', message: 'Variable 123 is not available; values that depend on it are empty.', nodeIds: ['d-1'] },
          { code: 'METRIC_WITHOUT_BUDGET_VARIABLE', message: 'METRIC "Revenue" has no budget variable; budget values are empty.', nodeIds: ['m-1'] },
        ]}
      />
    );

    const panel = screen.getByRole('status');
    expect(panel).toHaveTextContent('2 warnings: some values may be empty or unexpected');
    expect(panel).toHaveTextContent('"Leads" uses a variable that no longer exists; values that depend on it are empty.');
    expect(panel).toHaveTextContent('METRIC "Revenue" has no budget variable');
    expect(panel).not.toHaveTextContent('Variable 123');
  });
});
