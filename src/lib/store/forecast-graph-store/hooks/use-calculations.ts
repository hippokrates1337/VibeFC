import { useShallow } from 'zustand/shallow';
import { useMemo } from 'react';
import { useForecastGraphStore } from '../store';

/**
 * Hook for accessing calculation state
 * Provides calculation results, periods, and validation state
 *
 * Always subscribes to the store (no isClient early return) for consistent hook order.
 */
export const useCalculations = () =>
  useForecastGraphStore(
    useShallow((state) => ({
      calculationResults: state.calculationResults,
      isCalculating: state.isCalculating,
      calculationError: state.calculationError,
      lastCalculatedAt: state.lastCalculatedAt,
      forecastPeriods: state.forecastPeriods,
      graphValidation: state.graphValidation,
      isValidatingGraph: state.isValidatingGraph,
    }))
  );

/**
 * Hook for accessing calculation actions
 * Provides unified calculation, period management, validation, and data access
 */
export const useCalculationActions = () => {
  const store = useForecastGraphStore();

  return useMemo(
    () => ({
      calculateUnified: store.calculateUnified,
      loadUnifiedCalculationResults: store.loadUnifiedCalculationResults,
      setUnifiedCalculationResults: store.setUnifiedCalculationResults,
      clearCalculationResults: store.clearCalculationResults,
      updateForecastPeriods: store.updateForecastPeriods,
      setForecastPeriods: store.setForecastPeriods,
      validateGraph: store.validateGraph,
      setGraphValidation: store.setGraphValidation,
      clearGraphValidation: store.clearGraphValidation,
      getUnifiedNodeValueForMonth: store.getUnifiedNodeValueForMonth,
      getUnifiedMergedTimeSeriesData: store.getUnifiedMergedTimeSeriesData,
    }),
    [store]
  );
};
