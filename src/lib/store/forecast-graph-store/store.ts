import { create } from 'zustand';
import { createGraphActions } from './actions/graph-actions';
import { createCalculationActions } from './actions/calculation-actions';
import { createMetadataActions } from './actions/metadata-actions';
import { createUIActions } from './actions/ui-actions';
import { createDebugActions } from './actions/debug-actions';
import { initialState } from './state/initial-state';
import type { ForecastGraphState } from './state';
import type { AllActions } from './types';

/**
 * The forecast being edited (graph, periods, results, editor UI). Kept in memory only:
 * the server is the source of truth, and the editor warns before leaving with unsaved edits.
 */
export const useForecastGraphStore = create<ForecastGraphState & AllActions>()(
  (set, get) => {
    // Create actions once with stable references for Zustand v5 compatibility
    const graphActions = createGraphActions(set, get);
    const calculationActions = createCalculationActions(set, get);
    const metadataActions = createMetadataActions(set, get);
    const uiActions = createUIActions(set, get);
    const debugActions = createDebugActions(set, get);

    return {
      ...initialState,
      // Spread stable action references
      ...graphActions,
      ...calculationActions,
      ...metadataActions,
      ...uiActions,
      ...debugActions,
    };
  }
);
