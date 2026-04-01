import { logger } from '@/lib/utils/logger';
import { GraphConverter } from '@/lib/services/forecast-calculation/graph-converter';
import { forecastCalculationApi } from '@/lib/api/forecast-calculation';
import { forecastApi } from '@/lib/api/forecast';
import type { 
  ForecastGraphState
} from '../state';
import type {
  UnifiedCalculationRequest,
  UpdatePeriodsRequest
} from '../types';
import type { UnifiedCalculationResult } from '@/types/forecast';
import { compareMmYyyyAsc, monthsFromUnifiedCalculationResults } from '../utils/date-utils';

function syncVisualizationMonthToResults(
  set: (partial: unknown) => void,
  get: () => { selectedVisualizationMonth?: Date | null },
  result: UnifiedCalculationResult
) {
  const months = monthsFromUnifiedCalculationResults(result);
  if (!months?.length) return;
  const cur = get().selectedVisualizationMonth;
  const valid =
    cur &&
    months.some((m) => m.getTime() === cur.getTime());
  if (!valid) {
    set({ selectedVisualizationMonth: months[0] });
  }
}

export const createCalculationActions = (set: (partial: any) => void, get: () => any) => ({
  calculateUnified: async (request?: Partial<UnifiedCalculationRequest>) => {
    logger.log('[ForecastGraphStore] calculateUnified called with request:', request);
    const state = get();
    
    if (!state.forecastId) {
      throw new Error('Forecast ID is required for unified calculation');
    }
    
    try {
      set({ isCalculating: true, calculationError: null });
      
      // Default calculation request
      const defaultRequest: UnifiedCalculationRequest = {
        calculationTypes: ['historical', 'forecast', 'budget'],
        includeIntermediateNodes: true,
      };
      
      const finalRequest = { ...defaultRequest, ...request };
      
      logger.log(`[ForecastGraphStore] Triggering unified calculation for forecast ${state.forecastId}:`, finalRequest);
      
      // Use unified calculation API
      const result = await forecastCalculationApi.calculateUnified(state.forecastId, finalRequest);
      
      // Update periods from result
      if (result.periodInfo) {
        set({ 
          forecastPeriods: {
            forecastStartMonth: result.periodInfo.forecastStartMonth,
            forecastEndMonth: result.periodInfo.forecastEndMonth,
            actualStartMonth: result.periodInfo.actualStartMonth,
            actualEndMonth: result.periodInfo.actualEndMonth,
          }
        });
      }
      
      // Set unified calculation results
      set({ 
        calculationResults: result,
        lastCalculatedAt: result.calculatedAt,
        isCalculating: false,
        calculationError: null
      });

      syncVisualizationMonthToResults(set, get, result);
      
      logger.log('[ForecastGraphStore] Unified calculation completed successfully');
    } catch (error) {
      logger.error('[ForecastGraphStore] Unified calculation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown unified calculation error';
      set({ 
        calculationError: errorMessage,
        isCalculating: false
      });
      throw error;
    }
  },

  loadUnifiedCalculationResults: async () => {
    logger.log('[ForecastGraphStore] loadUnifiedCalculationResults called');
    const state = get();
    
    if (!state.forecastId) {
      logger.warn('[ForecastGraphStore] Cannot load unified calculation results without forecast ID');
      return;
    }
    
    try {
      logger.log(`[ForecastGraphStore] Loading unified calculation results for forecast ${state.forecastId}`);
      
      const result = await forecastCalculationApi.getUnifiedCalculationResults(state.forecastId);
      
      if (result) {
        // Update periods from result
        if (result.periodInfo) {
          set({ 
            forecastPeriods: {
              forecastStartMonth: result.periodInfo.forecastStartMonth,
              forecastEndMonth: result.periodInfo.forecastEndMonth,
              actualStartMonth: result.periodInfo.actualStartMonth,
              actualEndMonth: result.periodInfo.actualEndMonth,
            }
          });
        }
        
        set({ 
          calculationResults: result,
          lastCalculatedAt: result.calculatedAt,
          calculationError: null
        });

        syncVisualizationMonthToResults(set, get, result);

        logger.log('[ForecastGraphStore] Unified calculation results loaded successfully');
      } else {
        logger.log('[ForecastGraphStore] No unified calculation results found');
        set({ 
          calculationResults: null,
          lastCalculatedAt: null,
          calculationError: null
        });
      }
    } catch (error) {
      logger.error('[ForecastGraphStore] Failed to load unified calculation results:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load unified calculation results';
      set({ calculationError: errorMessage });
    }
  },

  setUnifiedCalculationResults: (results: any) => {
    logger.log('[ForecastGraphStore] setUnifiedCalculationResults called');
    set((state: ForecastGraphState) => {
      // If nodes are empty, populate from results
      let nodes = state.nodes;
      if (nodes.length === 0 && results && Array.isArray(results.allNodes)) {
        const { getDefaultNodeData } = require('../utils');
        nodes = results.allNodes.map((n: any) => ({
          id: n.nodeId,
          type: n.nodeType,
          data: getDefaultNodeData(n.nodeType),
          position: { x: 0, y: 0 },
        }));
      }
      
      // Update periods from result
      let forecastPeriods = state.forecastPeriods;
      if (results?.periodInfo) {
        forecastPeriods = {
          forecastStartMonth: results.periodInfo.forecastStartMonth,
          forecastEndMonth: results.periodInfo.forecastEndMonth,
          actualStartMonth: results.periodInfo.actualStartMonth,
          actualEndMonth: results.periodInfo.actualEndMonth,
        };
      }
      
      return {
        calculationResults: results,
        forecastPeriods,
        nodes,
        lastCalculatedAt: results?.calculatedAt || state.lastCalculatedAt,
      };
    });
    if (results) {
      syncVisualizationMonthToResults(set, get, results as UnifiedCalculationResult);
    }
  },

  clearCalculationResults: () => {
    logger.log('[ForecastGraphStore] clearCalculationResults called');
    set({
      calculationResults: null,
      lastCalculatedAt: null,
      calculationError: null,
    });
  },

  updateForecastPeriods: async (periods: UpdatePeriodsRequest) => {
    logger.log('[ForecastGraphStore] updateForecastPeriods called with:', periods);
    const state = get();
    
    if (!state.forecastId) {
      throw new Error('Forecast ID is required to update periods');
    }
    
    try {
      // Update periods via API
      await forecastApi.updateForecastPeriods(state.forecastId, periods);
      
      // Update local state and keep calculation snapshot periodInfo in sync (tables read forecastPeriods;
      // exports/debug may still use calculationResults.periodInfo)
      set((currentState: ForecastGraphState) => {
        const nextForecastPeriods = currentState.forecastPeriods
          ? {
              ...currentState.forecastPeriods,
              ...periods,
            }
          : {
              forecastStartMonth: periods.forecastStartMonth || '',
              forecastEndMonth: periods.forecastEndMonth || '',
              actualStartMonth: periods.actualStartMonth || '',
              actualEndMonth: periods.actualEndMonth || '',
            };

        const cr = currentState.calculationResults;
        const nextCalculationResults =
          cr && nextForecastPeriods
            ? {
                ...cr,
                periodInfo: {
                  forecastStartMonth: nextForecastPeriods.forecastStartMonth,
                  forecastEndMonth: nextForecastPeriods.forecastEndMonth,
                  actualStartMonth: nextForecastPeriods.actualStartMonth,
                  actualEndMonth: nextForecastPeriods.actualEndMonth,
                },
              }
            : cr;

        return {
          forecastPeriods: nextForecastPeriods,
          calculationResults: nextCalculationResults,
        };
      });
      
      logger.log('[ForecastGraphStore] Forecast periods updated successfully');
    } catch (error) {
      logger.error('[ForecastGraphStore] Failed to update forecast periods:', error);
      throw error;
    }
  },

  setForecastPeriods: (periods: any) => {
    logger.log('[ForecastGraphStore] setForecastPeriods called with:', periods);
    set({ forecastPeriods: periods });
  },

  validateGraph: async () => {
    logger.log('[ForecastGraphStore] validateGraph called');
    const state = get();
    
    try {
      set({ isValidatingGraph: true });
      
      // Use GraphConverter directly for immediate UI validation
      const graphConverter = new GraphConverter();
      const validation = graphConverter.validateGraph(state.nodes, state.edges);
      
      set({ graphValidation: validation, isValidatingGraph: false });
      return validation;
    } catch (error) {
      logger.error('[ForecastGraphStore] Graph validation failed:', error);
      const errorResult = {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
      set({ graphValidation: errorResult, isValidatingGraph: false });
      return errorResult;
    }
  },

  setGraphValidation: (validation: any) => {
    logger.log('[ForecastGraphStore] setGraphValidation called with:', validation);
    set({ graphValidation: validation });
  },

  clearGraphValidation: () => {
    logger.log('[ForecastGraphStore] clearGraphValidation called');
    set({ graphValidation: null });
  },

  getUnifiedNodeValueForMonth: (nodeId: string, month: string) => {
    const state = get();
    
    if (!state.calculationResults) {
      return null;
    }
    
    // Check metrics first, then allNodes
    const node = state.calculationResults.metrics.find((m: any) => m.nodeId === nodeId) ||
                 state.calculationResults.allNodes?.find((n: any) => n.nodeId === nodeId);
    
    if (!node) {
      return null;
    }
    
    return node.values.find((v: any) => v.month === month) || null;
  },

  getUnifiedMergedTimeSeriesData: (nodeId: string) => {
    const state = get();
    
    if (!state.calculationResults || !state.forecastPeriods) {
      return null;
    }
    
    // Find the node in unified results
    const node = state.calculationResults.metrics.find((m: any) => m.nodeId === nodeId) ||
                 state.calculationResults.allNodes?.find((n: any) => n.nodeId === nodeId);
    
    if (!node) {
      return null;
    }
    
    // Convert unified monthly values to merged format with MM-YYYY
    const values = node.values.map((monthlyValue: any) => {
      const actStart = state.forecastPeriods!.actualStartMonth;
      const actEnd = state.forecastPeriods!.actualEndMonth;
      const isPeriodActual = Boolean(
        actStart &&
          actEnd &&
          compareMmYyyyAsc(actStart, monthlyValue.month) <= 0 &&
          compareMmYyyyAsc(monthlyValue.month, actEnd) <= 0
      );
      
      return {
        month: monthlyValue.month, // Use MM-YYYY format as required
        forecast: monthlyValue.forecast,
        budget: monthlyValue.budget,
        historical: monthlyValue.historical,
        calculated: monthlyValue.calculated || null,
        isPeriodActual,
        formattedForecast: monthlyValue.forecast?.toString() || 'N/A',
        formattedBudget: monthlyValue.budget?.toString() || 'N/A',
        formattedHistorical: monthlyValue.historical?.toString() || 'N/A',
        formattedCalculated: monthlyValue.calculated?.toString() || 'N/A',
      };
    });
    
    return {
      nodeId,
      nodeType: node.nodeType,
      values,
      actualPeriodStart: state.forecastPeriods.actualStartMonth, // MM-YYYY format
      actualPeriodEnd: state.forecastPeriods.actualEndMonth, // MM-YYYY format
      forecastPeriodStart: state.forecastPeriods.forecastStartMonth, // MM-YYYY format
      forecastPeriodEnd: state.forecastPeriods.forecastEndMonth, // MM-YYYY format
    };
  },
});
