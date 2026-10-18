'use client';

import { useEffect } from 'react';
import { forecastApi } from '@/lib/api/forecast';
import { logger } from '@/lib/utils/logger';
import { useForecastGraph, useForecastGraphActions } from './use-forecast-graph';

export const useOrganizationForecastsLoader = (organizationId?: string | null) => {
  const { organizationForecasts, isLoading } = useForecastGraph();
  const {
    loadOrganizationForecasts,
    setLoading: setForecastLoading,
    setError: setForecastError,
  } = useForecastGraphActions();

  useEffect(() => {
    const loadForecasts = async () => {
      if (!organizationId) {
        loadOrganizationForecasts([]);
        return;
      }

      if (organizationForecasts.length > 0 || isLoading) {
        return;
      }

      try {
        setForecastLoading(true);
        setForecastError(null);

        const { data, error } = await forecastApi.getForecastsWithSummary(organizationId);

        if (error) {
          setForecastError(error.message);
          loadOrganizationForecasts([]);
          logger.warn('forecasts.organization-load.failed', {
            organizationId,
            reason: error.message,
          });
          return;
        }

        loadOrganizationForecasts(data ?? []);
      } catch (error) {
        setForecastError(error instanceof Error ? error.message : 'Failed to load forecasts');
        loadOrganizationForecasts([]);
        logger.error('forecasts.organization-load.exception', {
          organizationId,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      } finally {
        setForecastLoading(false);
      }
    };

    void loadForecasts();
  }, [
    isLoading,
    loadOrganizationForecasts,
    organizationForecasts.length,
    organizationId,
    setForecastError,
    setForecastLoading,
  ]);
};
