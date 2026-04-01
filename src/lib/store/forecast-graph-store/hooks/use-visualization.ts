import { useShallow } from 'zustand/shallow';
import { useMemo } from 'react';
import type { NodeVisualizationValue } from '@/types/forecast';
import { useForecastGraphStore } from '../store';
import {
  generateForecastMonths,
  generateMonthsInMmYyyyRange,
  monthsFromUnifiedCalculationResults,
} from '../utils';

/**
 * Hook for accessing visualization state
 * Provides visualization settings and forecast months
 *
 * Always subscribes to the store (no isClient early return) so hook order matches
 * between server and client renders.
 */
export const useVisualization = () =>
  useForecastGraphStore(
    useShallow((state) => ({
      selectedVisualizationMonth: state.selectedVisualizationMonth,
      showVisualizationSlider: state.showVisualizationSlider,
      forecastStartDate: state.forecastStartDate ?? '',
      forecastEndDate: state.forecastEndDate ?? '',
    }))
  );

/**
 * Hook for accessing visualization actions
 * Provides visualization controls and node value access
 */
export const useVisualizationActions = () => {
  const store = useForecastGraphStore();

  return useMemo(
    () => ({
      setSelectedVisualizationMonth: store.setSelectedVisualizationMonth,
      setShowVisualizationSlider: store.setShowVisualizationSlider,
      updateVisualizationMonthForPeriodChange: store.updateVisualizationMonthForPeriodChange,
      generateForecastMonths: store.generateForecastMonths,
      getNodeValueForMonth: store.getNodeValueForMonth,
    }),
    [store]
  );
};

/**
 * Slider month list: when forecast start/end dates exist, uses **only** that definition window
 * (not the full unified calculation timeline, which can include actual/historical months).
 */
export const useForecastMonths = () => {
  const calculationResults = useForecastGraphStore((s) => s.calculationResults);
  const forecastStartDateRaw = useForecastGraphStore((s) => s.forecastStartDate);
  const forecastEndDateRaw = useForecastGraphStore((s) => s.forecastEndDate);
  return useMemo(() => {
    const fromCalc = monthsFromUnifiedCalculationResults(calculationResults);

    let fromDef: Date[] = [];
    const startIso =
      typeof forecastStartDateRaw === 'string' && forecastStartDateRaw.trim().length > 0
        ? forecastStartDateRaw.trim()
        : '';
    const endIso =
      typeof forecastEndDateRaw === 'string' && forecastEndDateRaw.trim().length > 0
        ? forecastEndDateRaw.trim()
        : '';
    if (startIso && endIso) {
      fromDef = generateForecastMonths(startIso, endIso);
    }
    if (fromDef.length === 0 && calculationResults?.periodInfo) {
      const { forecastStartMonth, forecastEndMonth } = calculationResults.periodInfo;
      if (forecastStartMonth && forecastEndMonth) {
        fromDef = generateMonthsInMmYyyyRange(forecastStartMonth, forecastEndMonth);
      }
    }

    let result: Date[];

    if (fromDef.length > 0) {
      result = fromDef;
    } else if (fromCalc && fromCalc.length > 0) {
      result = fromCalc;
    } else {
      result = [];
    }

    return result;
  }, [calculationResults, forecastStartDateRaw, forecastEndDateRaw]);
};

/**
 * Value badge for a node for the selected slider month.
 * Subscribes to `calculationResults` so nodes re-run after calculate; do not memoize
 * only on `getNodeValueForMonth` (stable) or badges stay null after the first run.
 *
 * If the store has no selected month yet, uses the first forecast month so badges match
 * the slider default (index 0) even before MonthSlider syncs.
 */
export const useNodeVisualizationValue = (
  nodeId: string | undefined
): NodeVisualizationValue | null => {
  const calculationResults = useForecastGraphStore((s) => s.calculationResults);
  const {
    selectedVisualizationMonth: selectedMonth,
    showVisualizationSlider: showSlider,
  } = useVisualization();
  const forecastMonths = useForecastMonths();

  const effectiveMonth = selectedMonth ?? forecastMonths[0] ?? null;
  const { getNodeValueForMonth } = useVisualizationActions();

  return useMemo(() => {
    if (!effectiveMonth || !showSlider || !nodeId) {
      return null;
    }
    return getNodeValueForMonth(nodeId, effectiveMonth);
  }, [calculationResults, effectiveMonth, showSlider, nodeId, getNodeValueForMonth]);
};
