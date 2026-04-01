import { logger } from '@/lib/utils/logger';
import { formatToMmYyyy } from '../utils';
import { forecastCalculationApi } from '@/lib/api/forecast-calculation';
import type { 
  ForecastGraphState
} from '../state';
import type {
  LoadForecastParams, 
  ForecastMetadataUpdate 
} from '../types';

export const createMetadataActions = (set: (partial: any) => void, get: () => any) => ({
  loadForecast: (data: LoadForecastParams) => {
    logger.log('[ForecastGraphStore] loadForecast called with:', data);
    
    // Clean up orphaned references before loading
    const { cleanOrphanedReferences } = require('../utils');
    const { cleanedNodes, hadOrphanedRefs } = cleanOrphanedReferences(data.nodes, data.edges);
    
    if (hadOrphanedRefs) {
      logger.warn('[ForecastGraphStore] Cleaned up orphaned SEED node references during load');
    }
    
    set({
      forecastId: data.id,
      forecastName: data.name,
      forecastStartDate: data.startDate,
      forecastEndDate: data.endDate,
      organizationId: data.organizationId,
      nodes: cleanedNodes,
      edges: data.edges,
      isDirty: false, // Fresh data from server should not be dirty
      isLoading: false,
      error: null,
    });

    // Auto-set reasonable default actual period if not already configured
    // We'll set this in the state update to avoid circular dependencies
    const forecastStart = new Date(data.startDate);
    const currentDate = new Date();
    
    // Set actual period from start of previous year to end of previous month
    const actualStart = new Date(forecastStart.getFullYear() - 1, 0, 1); // Jan 1 of previous year
    const actualEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0); // Last day of previous month
    
    // Only set if actual period would be before forecast period (logical constraint)
    if (actualEnd < forecastStart) {
      const actualStartStr = actualStart.toISOString().split('T')[0];
      const actualEndStr = actualEnd.toISOString().split('T')[0];
      
      logger.log('[ForecastGraphStore] Setting default actual period:', { actualStartStr, actualEndStr });
      
      set({
        forecastPeriods: {
          forecastStartMonth: formatToMmYyyy(data.startDate),
          forecastEndMonth: formatToMmYyyy(data.endDate),
          actualStartMonth: formatToMmYyyy(actualStartStr),
          actualEndMonth: formatToMmYyyy(actualEndStr),
        },
      });
      
      // Note: Unified calculation should be triggered manually by the user
      // to avoid circular dependencies and infinite loops
    }

    logger.log('[ForecastGraphStore] Forecast loaded and store updated.');
  },

  setForecastMetadata: (metadata: ForecastMetadataUpdate) => {
    logger.log('[ForecastGraphStore] setForecastMetadata called with:', metadata);
    set((state: ForecastGraphState) => {
      const newState = {
        forecastName: metadata.name ?? state.forecastName,
        forecastStartDate: metadata.startDate ?? state.forecastStartDate,
        forecastEndDate: metadata.endDate ?? state.forecastEndDate,
        isDirty: true,
      };
      logger.log('[ForecastGraphStore] Forecast metadata updated.', newState);
      return newState;
    });
  },

  loadOrganizationForecasts: (forecasts: any[]) => {
    logger.log('[ForecastGraphStore] loadOrganizationForecasts called with:', forecasts);
    set({
      organizationForecasts: forecasts,
      isLoading: false,
      error: null,
    });
    logger.log('[ForecastGraphStore] Organization forecasts loaded.');
  },
});
