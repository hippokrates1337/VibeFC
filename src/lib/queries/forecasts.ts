'use client';

import { useQuery } from '@tanstack/react-query';
import { forecastApi, type ForecastWithSummary } from '@/lib/api/forecast';

export const forecastKeys = {
  all: ['forecasts'] as const,
  /** The forecasts of one organization (list cards and dropdowns). */
  list: (organizationId: string | null | undefined) => ['forecasts', 'list', organizationId ?? null] as const,
};

/**
 * The forecasts of an organization. Cached per organization, so switching back and forth
 * shows each organization's own list; refetched whenever a page using it mounts.
 */
export function useOrganizationForecasts(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: forecastKeys.list(organizationId),
    queryFn: async (): Promise<ForecastWithSummary[]> => {
      const { data, error } = await forecastApi.getForecastsWithSummary(organizationId!);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
    enabled: Boolean(organizationId),
  });
}
