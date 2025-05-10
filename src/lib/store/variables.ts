import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { logger } from '@/lib/utils/logger'

export interface TimeSeriesData {
  date: Date
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
  fetchVariables: (userId: string, token: string) => Promise<void>
  setSelectedOrganizationId: (organizationId: string | null) => void
}

// Helper function to rehydrate dates in a variable
// Export for testing purposes
export const rehydrateVariable = (variable: Variable): Variable => ({
  ...variable,
  timeSeries: variable.timeSeries.map(ts => ({
    ...ts,
    date: new Date(ts.date)
  }))
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
        fetchVariables: async (userId: string, token: string) => {
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

          if (relevantVariablesExist) {
            logger.log('[fetchVariables] Variables already exist in store for the selected organization, skipping fetch.');
            return;
          }

          logger.log('[fetchVariables] Starting fetch attempt for user:', userId);
          
          logger.log('[fetchVariables] Setting loading state to true');
          set({ isLoading: true, error: null });
          
          try {
            // Use environment variable for the standalone backend API URL
            const backendUrlBase = process.env.NEXT_PUBLIC_BACKEND_URL;
            if (!backendUrlBase) {
              throw new Error('Backend API URL is not configured. Set NEXT_PUBLIC_BACKEND_URL environment variable.');
            }
            const fetchUrl = `${backendUrlBase}/data-intake/variables/${userId}`;
            
            logger.log(`[fetchVariables] Fetching variables from Backend API: ${fetchUrl}`);
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
              const transformedVariables: Variable[] = data.variables.map((v: any) => {              
                const transformedTimeSeries = Array.isArray(v.values) 
                  ? v.values.map((val: any) => {
                      const parsedValue = val.value !== null && val.value !== undefined 
                        ? Number(val.value) 
                        : null;
                      
                      if (parsedValue !== null && isNaN(parsedValue)) {
                        logger.warn(`Non-numeric value detected: ${val.value}`);
                      }
                      
                      return {
                        date: new Date(val.date),
                        value: parsedValue
                      };
                    })
                  : [];
                
                // Ensure organizationId is mapped from the backend response
                if (!v.organization_id) {
                  logger.warn(`[fetchVariables] Variable ${v.id} (${v.name}) received from backend is missing organization_id.`);
                }

                return {
                  id: v.id,
                  name: v.name,
                  type: v.type as 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN',
                  organizationId: v.organization_id, // Map organizationId
                  timeSeries: transformedTimeSeries
                };
              });
              
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
        onRehydrateStorage: () => (state) => {
          logger.log('[onRehydrateStorage] Starting rehydration...');
          
          if (state) {
            logger.log('[onRehydrateStorage] State found in storage');
            
            if (state.variables && state.variables.length > 0) {
              // Rehydrate dates first
              logger.log(`[onRehydrateStorage] Found ${state.variables.length} variables, rehydrating dates...`);
              state.variables = state.variables.map(rehydrateVariable);
              logger.log(`[onRehydrateStorage] Store rehydrated with ${state.variables.length} variables.`);
            } else {
              logger.log('[onRehydrateStorage] No variables found in storage');
            }
          } else {
            logger.log('[onRehydrateStorage] No state found in storage');
          }
          
          logger.log('[onRehydrateStorage] Rehydration complete.');
        }
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