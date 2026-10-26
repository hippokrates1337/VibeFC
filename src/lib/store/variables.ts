import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { logger } from '@/lib/utils/logger'

/** One month of a variable. `month` is 'YYYY-MM' (no Date: months must not depend on the time zone). */
export interface TimeSeriesData {
  month: string
  value: number | null
}

export interface Variable {
  id: string
  name: string
  type: 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN'
  timeSeries: TimeSeriesData[]
  organizationId: string
}

interface VariableState {
  variables: Variable[]
  isLoading: boolean
  error: string | null
  selectedOrganizationId: string | null
  setVariables: (variables: Variable[]) => void
  addVariables: (variables: Variable[]) => void
  clearVariables: () => void
  /** `force` reloads even when the store already holds the organization's variables (e.g. after saving). */
  fetchVariables: (userId: string, token: string, options?: { force?: boolean }) => Promise<void>
  setSelectedOrganizationId: (organizationId: string | null) => void
}

/** API variable row (`values: [{date: 'YYYY-MM-01', value}]`) -> store variable. */
export const toStoreVariable = (v: any): Variable => ({
  id: v.id,
  name: v.name,
  type: v.type as Variable['type'],
  organizationId: v.organization_id,
  timeSeries: (Array.isArray(v.values) ? v.values : []).map((point: any) => ({
    month: String(point.date).slice(0, 7),
    value: point.value === null || point.value === undefined ? null : Number(point.value),
  })),
})

// Create a default export so we can debug it
const createVariableStore = () => {
  return create<VariableState>()(
    persist(
      (set, get) => ({
        variables: [] as Variable[],
        isLoading: false,
        error: null,
        selectedOrganizationId: null,
        setVariables: (variables: Variable[]) => set({ variables }),
        addVariables: (variables: Variable[]) => 
          set((state) => ({
            variables: [
              ...state.variables,
              ...variables.filter(
                (newVar) => !state.variables.some(
                  (existingVar) => existingVar.id === newVar.id
                )
              )
            ]
          })),
        clearVariables: () => set({ variables: [] }),
        setSelectedOrganizationId: (organizationId: string | null) => {
          logger.log('[VariableStore] setSelectedOrganizationId called with:', organizationId);
          set({ selectedOrganizationId: organizationId });
        },
        fetchVariables: async (userId: string, token: string, options?: { force?: boolean }) => {
          const state = get(); // Get current state at the beginning

          // Prevent duplicate fetches if already loading
          if (state.isLoading) {
            logger.log('[fetchVariables] Variables are already being fetched, skipping duplicate fetch.');
            return;
          }

          // Avoid fetching if variables already exist for the selected organization
          // If no org is selected, this check might need refinement depending on desired behavior.
          // Currently, it checks if *any* variable exists for the selected org.
          const relevantVariablesExist = state.selectedOrganizationId
            ? state.variables.some(v => v.organizationId === state.selectedOrganizationId)
            : false; // Only skip if an org is selected and data for it exists

          if (relevantVariablesExist && !options?.force) {
            logger.log('[fetchVariables] Variables already exist in store for the selected organization, skipping fetch.');
            return;
          }

          logger.log('[fetchVariables] Starting fetch attempt for user:', userId);
          
          logger.log('[fetchVariables] Setting loading state to true');
          set({ isLoading: true, error: null });
          
          try {
            // Use Next.js API route instead of calling backend directly
            const fetchUrl = `/api/data-intake/variables/user/${userId}`;
            
            logger.log(`[fetchVariables] Fetching variables from Next.js API: ${fetchUrl}`);
            const response = await fetch(fetchUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              cache: 'no-store'
            });
            
            logger.log('[fetchVariables] API response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              logger.error('[fetchVariables] API error response:', errorText);
              let errorMessage;
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || `Failed to fetch variables (status: ${response.status})`;
              } catch (e) {
                errorMessage = `Failed to fetch variables (status: ${response.status}): ${errorText.substring(0, 100)}`;
              }
              throw new Error(errorMessage);
            }
            
            const responseText = await response.text();
            logger.log('[fetchVariables] API response length:', responseText.length);
            
            if (!responseText || responseText.trim() === '') {
              logger.log('[fetchVariables] Empty response received from API');
              set({ variables: [], isLoading: false });
              return;
            }
            
            let data;
            try {
              data = JSON.parse(responseText);
              logger.log('[fetchVariables] Received data from API with structure:', {
                hasData: !!data,
                hasVariables: !!(data && data.variables),
                variablesCount: data?.variables?.length || 0
              });
            } catch (e) {
              logger.error('[fetchVariables] Failed to parse response JSON:', e);
              throw new Error('Failed to parse response data: ' + (e instanceof Error ? e.message : String(e)));
            }
            
            if (data && data.variables && Array.isArray(data.variables)) {
              const transformedVariables: Variable[] = data.variables.map(toStoreVariable);

              logger.log('[fetchVariables] Successfully loaded variables:', transformedVariables.length);
              set({ variables: transformedVariables, isLoading: false });
            } else {
              logger.log('[fetchVariables] No variables array found in the API response');
              set({ variables: [], isLoading: false });
            }
          } catch (error) {
            logger.error('[fetchVariables] Error fetching variables:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load variables from the server.',
            });
          } finally {
            // Ensure isLoading is always reset
            logger.log('[fetchVariables] Fetch attempt finished, setting isLoading to false.');
            set({ isLoading: false }); 
          }
        },
      }),
      {
        name: 'variable-storage',
        storage: createJSONStorage(() => localStorage),
        // v1: time series points are {month: 'YYYY-MM'} instead of {date}. Older caches are
        // dropped and reloaded from the server.
        version: 1,
        migrate: (persisted, version) => {
          const state = persisted as Partial<VariableState>;
          return version < 1 ? { ...state, variables: [] } : state;
        },
      }
    )
  )
}

// Explicitly type the store hook
export const useVariableStore = createVariableStore();
export const useSetSelectedOrganizationId = () => useVariableStore((state) => state.setSelectedOrganizationId);
export const useIsVariablesLoading = () => useVariableStore((state) => state.isLoading);
export const useFetchVariables = () => useVariableStore((state) => state.fetchVariables);
export const useVariableError = () => useVariableStore((state) => state.error); 