import type { Forecast as ClientForecastSummary } from '@/lib/api/forecast';

export interface CoreForecastState {
  forecastId: string | null;
  forecastName: string;
  forecastStartDate: string | null;
  forecastEndDate: string | null;
  organizationId: string | null;
  organizationForecasts: ClientForecastSummary[];
}
