import React from 'react';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ForecastDefinitionPage from '../page';
import { forecastApi } from '@/lib/api/forecast';

const mockLoadOrganizationForecasts = jest.fn();
const mockResetStore = jest.fn();
let mockGraphState: Record<string, unknown>;

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/api/forecast', () => ({ forecastApi: { deleteForecast: jest.fn(), createForecast: jest.fn() } }));
jest.mock('@/lib/store/organization', () => ({
  useOrganizationStore: (selector: (state: unknown) => unknown) => selector({ currentOrganization: { id: 'org-1' } }),
}));
jest.mock('@/lib/store/forecast-graph-store/hooks', () => ({
  useForecastGraph: () => mockGraphState,
  useForecastGraphActions: () => ({ loadOrganizationForecasts: mockLoadOrganizationForecasts, resetStore: mockResetStore }),
  useOrganizationForecastsLoader: jest.fn(),
}));

const forecasts = [
  { id: 'f-1', name: 'Budget 2026', forecastStartDate: '2026-01-01', forecastEndDate: '2026-12-31', updatedAt: '2026-10-01' },
  { id: 'f-2', name: 'Plan 2027', forecastStartDate: '2027-01-01', forecastEndDate: '2027-12-31', updatedAt: '2026-10-02' },
];
const deleteForecast = forecastApi.deleteForecast as jest.Mock;

describe('ForecastDefinitionPage: deleting a forecast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGraphState = { organizationForecasts: forecasts, isLoading: false, error: null, forecastId: 'f-1' };
  });

  test('deletes the forecast after confirmation and removes it from the list', async () => {
    const user = userEvent.setup();
    deleteForecast.mockResolvedValue({ data: undefined, error: null });
    render(<ForecastDefinitionPage />);

    await user.click(screen.getByRole('button', { name: 'Delete Budget 2026' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('"Budget 2026" will be deleted');
    await user.click(screen.getByRole('button', { name: 'Delete forecast' }));

    await waitFor(() => expect(deleteForecast).toHaveBeenCalledWith('f-1'));
    expect(mockLoadOrganizationForecasts).toHaveBeenCalledWith([forecasts[1]]);
    // f-1 is open in the editor store, so the store is cleared
    expect(mockResetStore).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  test('cancelling deletes nothing', async () => {
    const user = userEvent.setup();
    render(<ForecastDefinitionPage />);

    await user.click(screen.getByRole('button', { name: 'Delete Plan 2027' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(deleteForecast).not.toHaveBeenCalled();
    expect(mockLoadOrganizationForecasts).not.toHaveBeenCalled();
  });

  test('keeps the forecast listed when deleting fails', async () => {
    const user = userEvent.setup();
    deleteForecast.mockResolvedValue({ data: undefined, error: { message: 'Forbidden' } });
    render(<ForecastDefinitionPage />);

    await user.click(screen.getByRole('button', { name: 'Delete Plan 2027' }));
    await user.click(screen.getByRole('button', { name: 'Delete forecast' }));

    await waitFor(() => expect(deleteForecast).toHaveBeenCalledWith('f-2'));
    expect(mockLoadOrganizationForecasts).not.toHaveBeenCalled();
    expect(mockResetStore).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
