import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createGraphActions } from './actions/graph-actions';
import { createCalculationActions } from './actions/calculation-actions';
import { createMetadataActions } from './actions/metadata-actions';
import { createUIActions } from './actions/ui-actions';
import { createDebugActions } from './actions/debug-actions';
import { initialState } from './state/initial-state';
import type { ForecastGraphState } from './state';
import type { AllActions } from './types';

export const useForecastGraphStore = create<ForecastGraphState & AllActions>()(
  persist(
    (set, get) => {
      // Create actions once with stable references for Zustand v5 compatibility
      const graphActions = createGraphActions(set, get);
      const calculationActions = createCalculationActions(set, get);
      const metadataActions = createMetadataActions(set, get);
      const uiActions = createUIActions(set, get);
      const debugActions = createDebugActions(set, get);
      
      // Add hydration state management
      const hydrationActions = {
        _setHasHydrated: (hasHydrated: boolean) => {
          set({ _hasHydrated: hasHydrated });
        },
      };
      
      return {
        ...initialState,
        // Add hydration state
        _hasHydrated: false,
        // Spread stable action references
        ...graphActions,
        ...calculationActions,
        ...metadataActions,
        ...uiActions,
        ...debugActions,
        ...hydrationActions,
      };
    },
    {
      name: 'forecast-graph-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential state (exclude hydration state)
        forecastId: state.forecastId,
        forecastName: state.forecastName,
        forecastStartDate: state.forecastStartDate,
        forecastEndDate: state.forecastEndDate,
        organizationId: state.organizationId,
        nodes: state.nodes,
        edges: state.edges,
        forecastPeriods: state.forecastPeriods,
      }),
      // Update onRehydrateStorage for Zustand v5
      onRehydrateStorage: (state) => {
        console.log('🔄 Rehydrating forecast store:', !!state);
        return (state, error) => {
          if (error) {
            console.error('❌ Failed to rehydrate forecast store:', error);
          } else {
            console.log('✅ Forecast store rehydration successful');
            // Set hydration flag after successful rehydration
            if (state) {
              state._setHasHydrated(true);
            }
          }
        };
      },
    }
  )
);
