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
  setVariables: (variables: Variable[]) => void
  addVariables: (variables: Variable[]) => void
  clearVariables: () => void
}

// Helper function to rehydrate dates in a variable
const rehydrateVariable = (variable: Variable): Variable => ({
  ...variable,
  timeSeries: variable.timeSeries.map(ts => ({
    ...ts,
    date: new Date(ts.date)
  }))
})

export const useVariableStore = create<VariableState>()(
  persist(
    (set) => ({
      variables: [] as Variable[],
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
      clearVariables: () => set({ variables: [] })
    }),
    {
      name: 'variable-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.variables) {
          // Rehydrate dates in all variables
          state.variables = state.variables.map(rehydrateVariable)
        }
      }
    }
  )
) 