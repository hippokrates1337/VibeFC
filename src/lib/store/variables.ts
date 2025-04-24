import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TimeSeriesData {
  date: Date
  value: number | null
}

export interface Variable {
  id: string
  name: string
  type: 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN'
  timeSeries: TimeSeriesData[]
}

interface VariableState {
  variables: Variable[]
  isLoading: boolean
  error: string | null
  setVariables: (variables: Variable[]) => void
  addVariables: (variables: Variable[]) => void
  clearVariables: () => void
  fetchVariables: () => Promise<void>
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
        fetchVariables: async () => {
          console.log('[fetchVariables] Starting fetch attempt');
          console.log('[fetchVariables] Current state:', {
            variableCount: get().variables.length,
            isLoading: get().isLoading
          });
          
          // Check if variables already exist in the store or are already loading
          if (get().variables.length > 0) {
            console.log('[fetchVariables] Variables already exist in store, skipping fetch.');
            return; // Exit early if variables are present
          }
          
          if (get().isLoading) {
            console.log('[fetchVariables] Variables are already being fetched, skipping duplicate fetch.');
            return; // Exit early if a fetch is already in progress
          }

          console.log('[fetchVariables] Setting loading state to true');
          set({ isLoading: true, error: null });
          
          try {
            const userId = "frontend-user";
            
            console.log('[fetchVariables] Fetching variables from API...');
            const response = await fetch(`/api/data-intake/variables/user/${userId}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              cache: 'no-store'
            });
            
            console.log('[fetchVariables] API response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('[fetchVariables] API error response:', errorText);
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
            console.log('[fetchVariables] API response length:', responseText.length);
            
            if (!responseText || responseText.trim() === '') {
              console.log('[fetchVariables] Empty response received from API');
              set({ variables: [], isLoading: false });
              return;
            }
            
            let data;
            try {
              data = JSON.parse(responseText);
              console.log('[fetchVariables] Received data from API with structure:', {
                hasData: !!data,
                hasVariables: !!(data && data.variables),
                variablesCount: data?.variables?.length || 0
              });
            } catch (e) {
              console.error('[fetchVariables] Failed to parse response JSON:', e);
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
                        console.warn(`Non-numeric value detected: ${val.value}`);
                      }
                      
                      return {
                        date: new Date(val.date),
                        value: parsedValue
                      };
                    })
                  : [];
                
                return {
                  id: v.id,
                  name: v.name,
                  type: v.type as 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN',
                  timeSeries: transformedTimeSeries
                };
              });
              
              console.log('[fetchVariables] Successfully loaded variables:', transformedVariables.length);
              set({ variables: transformedVariables, isLoading: false });
            } else {
              console.log('[fetchVariables] No variables array found in the API response');
              set({ variables: [], isLoading: false });
            }
          } catch (error) {
            console.error('[fetchVariables] Error fetching variables:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load variables from the server.',
              isLoading: false 
            });
          }
        }
      }),
      {
        name: 'variable-storage',
        storage: createJSONStorage(() => localStorage),
        onRehydrateStorage: () => (state) => {
          console.log('[onRehydrateStorage] Starting rehydration...');
          
          if (state) {
            console.log('[onRehydrateStorage] State found in storage');
            
            if (state.variables && state.variables.length > 0) {
              // Rehydrate dates first
              console.log(`[onRehydrateStorage] Found ${state.variables.length} variables, rehydrating dates...`);
              state.variables = state.variables.map(rehydrateVariable);
              console.log(`[onRehydrateStorage] Store rehydrated with ${state.variables.length} variables.`);
            } else {
              console.log('[onRehydrateStorage] No variables found in storage');
            }
          } else {
            console.log('[onRehydrateStorage] No state found in storage');
          }
          
          // Always fetch variables after rehydration completes
          // Use setTimeout to ensure the store is fully initialized
          console.log('[onRehydrateStorage] Scheduling fetch after rehydration');
          setTimeout(() => {
            console.log('[onRehydrateStorage] Initiating fetch from rehydration callback');
            useVariableStore.getState().fetchVariables();
          }, 100);
        }
      }
    )
  )
}

export const useVariableStore = createVariableStore(); 