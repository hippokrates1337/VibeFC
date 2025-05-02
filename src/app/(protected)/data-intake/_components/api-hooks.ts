import { useCallback, useState } from 'react'
import { type Variable, type TimeSeriesData, useFetchVariables } from '@/lib/store/variables'
import { useAuth } from '@/providers/auth-provider'
import { useOrganizationStore } from '@/lib/store/organization'

interface ApiStatus {
  loading: boolean
  error: string | null
  success: boolean
}

export const useVariableApi = (variables: Variable[], setVariables: (variables: Variable[]) => void) => {
  const { session, user } = useAuth()
  const currentOrganization = useOrganizationStore(state => state.currentOrganization)
  const fetchVariables = useFetchVariables()
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    loading: false,
    error: null,
    success: false
  })

  const getAuthHeaders = useCallback(() => {
    if (!session?.access_token) {
      console.error('No access token found. User might be logged out.')
      throw new Error('Authentication token is missing. Please log in again.')
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    }
  }, [session])

  // Helper to get backend base URL
  const getBackendUrl = useCallback(() => {
    const backendUrlBase = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrlBase) {
      throw new Error('Backend API URL is not configured. Set NEXT_PUBLIC_BACKEND_URL environment variable.');
    }
    return backendUrlBase;
  }, []);

  const resetSuccessStatus = useCallback(() => {
    setTimeout(() => {
      setApiStatus(prev => ({ ...prev, success: false }))
    }, 3000)
  }, [])

  const handleImportVariables = useCallback(async (
    decisions: { variable: Variable, action: 'add' | 'update' | 'skip', replaceId?: string }[]
  ): Promise<void> => {
    const newVariables = [...variables]
    const variablesToAdd = decisions.filter(d => d.action === 'add').map(d => d.variable)
    
    console.log('Variables to be added locally:', variablesToAdd.length)
    console.log('Decision actions:', decisions.map(d => d.action))
    
    // Map of frontend variable IDs to their original variable objects
    const frontendVariableMap = new Map<string, Variable>()
    
    decisions.forEach(({ variable, action, replaceId }) => {
      if (action === 'add') {
        newVariables.push(variable)
        frontendVariableMap.set(variable.id, variable)
      } else if (action === 'update' && replaceId) {
        const index = newVariables.findIndex(v => v.id === replaceId)
        if (index !== -1) {
          newVariables[index] = { ...variable, id: replaceId }
        }
      }
      // Skip if action is 'skip'
    })
    
    // Set variables without waiting for API response to improve UX
    setVariables(newVariables)

    // Send variables marked as 'add' to the backend API
    if (variablesToAdd.length > 0) {
      setApiStatus({ loading: true, error: null, success: false })
      
      // Check for user and organization context
      if (!user || !currentOrganization) {
        setApiStatus({
          loading: false,
          error: 'User or organization context is missing. Cannot import variables.',
          success: false,
        })
        console.error('Missing user or organization context')
        return
      }

      try {
        const headers = getAuthHeaders()

        // Format variables for the API, including user and organization IDs
        const apiPayload = {
          variables: variablesToAdd.map(variable => ({
            id: variable.id,
            name: variable.name,
            type: variable.type,
            user_id: user.id,
            organization_id: currentOrganization.id,
            values: variable.timeSeries.map(ts => ({
              date: `${ts.date.getFullYear()}-${String(ts.date.getMonth() + 1).padStart(2, '0')}-${String(ts.date.getDate()).padStart(2, '0')}`,
              value: ts.value,
            })),
          })),
        }
        
        const backendUrl = getBackendUrl();
        const importUrl = `${backendUrl}/data-intake/variables`;
        console.log('Sending payload to Backend API:', importUrl);
        console.log('Payload:', JSON.stringify(apiPayload, null, 2));
        
        const response = await fetch(importUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(apiPayload)
        })
        
        console.log('API response status:', response.status)
        const responseData = await response.json()
        console.log('API response data:', responseData)
        
        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to save variables to the server')
        }
        
        // Check if the response contains created variables with backend IDs
        if (responseData.variables && Array.isArray(responseData.variables)) {
          console.log('Received variables from backend:', responseData.variables)
          
          // We no longer need to map IDs since the same ID is used in both frontend and backend
          // Just log for debugging purposes
          responseData.variables.forEach((variable: any) => {
            console.log(`Variable with ID ${variable.id} successfully saved`)
          })
        }
        
        setApiStatus({
          loading: false,
          error: null,
          success: true
        })

        // Fetch variables again after successful import to ensure sync
        if (user && session?.access_token) {
          console.log('[handleImportVariables] Import successful, refetching variables...');
          await fetchVariables(user.id, session.access_token);
        } else {
          console.warn('[handleImportVariables] Cannot refetch variables: missing user or token.');
        }

        resetSuccessStatus()
        
      } catch (error) {
        console.error('Error in API request:', error)
        setApiStatus({
          loading: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          success: false
        })
      }
    }
  }, [variables, setVariables, resetSuccessStatus, session, user, currentOrganization, getAuthHeaders, getBackendUrl, fetchVariables])

  const handleDeleteVariable = useCallback(async (variableId: string, organizationId: string | null): Promise<void> => {
    // Validate organizationId before proceeding
    if (!organizationId) {
      console.error('Organization ID is missing, cannot delete variable.')
      setApiStatus({
        loading: false,
        error: 'Cannot delete: Organization context is missing.',
        success: false,
      })
      return
    }

    try {
      setApiStatus({ loading: true, error: null, success: false })
      
      const headers = getAuthHeaders()

      // Debug logging
      console.log('==== DELETE OPERATION START ====')
      console.log('Variable ID to delete:', variableId)
      console.log('Current variables in store:', variables.map(v => ({ id: v.id, name: v.name })))
      
      // Find the variable to get the backend ID if it exists
      const variableToDelete = variables.find(v => v.id === variableId)
      if (!variableToDelete) {
        throw new Error('Variable not found in local store')
      }
      
      // Backend expects DELETE /api/data-intake/variables with body { ids: [...], organizationId: "..." }
      const backendUrl = getBackendUrl();
      const deleteUrl = `${backendUrl}/data-intake/variables`;
      const payload = { ids: [variableId], organizationId: organizationId }
      console.log('Calling Backend API endpoint:', deleteUrl, 'with payload:', payload)
      
      // Call backend API to delete the variable
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: headers,
        body: JSON.stringify(payload)
      })
      
      console.log('API Response Status:', response.status, response.statusText)
      
      if (!response.ok) {
        // Try to parse as JSON, but handle cases where it might be HTML or other formats
        const contentType = response.headers.get('content-type')
        console.log('Response content type:', contentType)
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          console.log('Error data:', errorData)
          throw new Error(errorData.message || `Failed to delete variable: ${response.status} ${response.statusText}`)
        } else {
          throw new Error(`Failed to delete variable: ${response.status} ${response.statusText}`)
        }
      } else {
        // Try to parse successful response if available
        try {
          const responseText = await response.text()
          if (responseText) {
            console.log('Response text:', responseText)
            const responseData = JSON.parse(responseText)
            console.log('Response data:', responseData)
            
            // If the backend tells us the variable doesn't exist there, we can still remove it locally
            if (responseData.message === "No variables found to delete" && responseData.count === 0) {
              console.log('Variable not found in backend but proceeding with local deletion')
            }
          } else {
            console.log('Empty response body')
          }
        } catch (e) {
          console.log('Could not parse response:', e)
        }
      }
      
      // Remove the variable locally only after successful API call
      const updatedVariables = variables.filter(variable => variable.id !== variableId)
      console.log('Updating local state, removing variable with ID:', variableId)
      console.log('Updated variables count:', updatedVariables.length)
      setVariables(updatedVariables)
      
      setApiStatus({
        loading: false,
        error: null,
        success: true
      })
      
      resetSuccessStatus()
      
      console.log('==== DELETE OPERATION COMPLETE ====')
    } catch (error) {
      console.error('Error deleting variable:', error)
      setApiStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete variable from server',
        success: false
      })
      console.log('==== DELETE OPERATION FAILED ====')
    }
  }, [variables, setVariables, resetSuccessStatus, session, getAuthHeaders, getBackendUrl])

  const handleUpdateVariable = useCallback(async (
    variableId: string, 
    updateData: { name?: string; timeSeries?: TimeSeriesData[] },
    organizationId: string | null
  ): Promise<void> => {
    // Add validation for organizationId if service layer requires it for PUT
    if (!organizationId) {
      console.error('Organization ID is missing, cannot update variable.')
      setApiStatus({
        loading: false,
        error: 'Cannot update: Organization context is missing.',
        success: false,
      })
      return
    }
    setApiStatus({ loading: true, error: null, success: false })
    
    // Check for user context (needed for potential future backend logic)
    if (!user) {
      setApiStatus({
        loading: false,
        error: 'User context is missing. Cannot update variable.',
        success: false,
      })
      console.error('Missing user context for update')
      return
    }

    try {
      const headers = getAuthHeaders()
      console.log('==== UPDATE OPERATION START ====')
      console.log('Variable ID to update:', variableId)
      console.log('Update data:', updateData)
      
      // Find the variable to update
      const variableToUpdate = variables.find(v => v.id === variableId)
      if (!variableToUpdate) {
        throw new Error('Variable not found in local store')
      }
      
      // Construct the request body for bulk update API
      const payload = {
        variables: [
          {
            id: variableId,
            name: updateData.name || variableToUpdate.name,
            type: variableToUpdate.type,
            user_id: user.id,
            organization_id: organizationId,
            values: updateData.timeSeries 
              ? updateData.timeSeries.map(ts => ({
                  date: `${ts.date.getFullYear()}-${String(ts.date.getMonth() + 1).padStart(2, '0')}-${String(ts.date.getDate()).padStart(2, '0')}`, 
                  value: ts.value
                }))
              : variableToUpdate.timeSeries.map(ts => ({
                  date: `${ts.date.getFullYear()}-${String(ts.date.getMonth() + 1).padStart(2, '0')}-${String(ts.date.getDate()).padStart(2, '0')}`,
                  value: ts.value
                }))
          }
        ]
      }
      
      const backendUrl = getBackendUrl();
      const updateUrl = `${backendUrl}/data-intake/variables`;
      console.log('Sending payload to Backend API:', updateUrl);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(payload)
      })
      
      console.log('API response status:', response.status)
      const responseData = await response.json()
      console.log('API response data:', responseData)
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update variable on the server')
      }
      
      // Update local state with the changes
      const updatedVariables = variables.map(variable => {
        if (variable.id === variableId) {
          // Create a copy of the variable to update
          const updatedVariable = { ...variable }
          
          // Update name if provided
          if (updateData.name !== undefined) {
            updatedVariable.name = updateData.name
          }
          
          // Update time series if provided
          if (updateData.timeSeries !== undefined) {
            updatedVariable.timeSeries = updateData.timeSeries
          }
          
          return updatedVariable
        }
        return variable
      })
      
      setVariables(updatedVariables)
      
      setApiStatus({
        loading: false,
        error: null,
        success: true
      })
      
      resetSuccessStatus()
      
      console.log('==== UPDATE OPERATION COMPLETE ====')
    } catch (error) {
      console.error('Error updating variable:', error)
      setApiStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update variable on server',
        success: false
      })
      console.log('==== UPDATE OPERATION FAILED ====')
    }
  }, [variables, setVariables, resetSuccessStatus, session, user, getAuthHeaders, getBackendUrl])

  return {
    apiStatus,
    setApiStatus,
    handleImportVariables,
    handleDeleteVariable,
    handleUpdateVariable
  }
}

export const useCsvProcessor = (variables: Variable[]) => {
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [processedVariables, setProcessedVariables] = useState<Variable[]>([])
  const [showImportModal, setShowImportModal] = useState<boolean>(false)

  const parseCSV = useCallback(async (file: File): Promise<void> => {
    setIsUploading(true)
    setError(null)

    try {
      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file')
      }

      const text = await file.text()
      
      // Check if file is empty
      if (!text.trim()) {
        throw new Error('The uploaded file is empty')
      }
      
      // Detect delimiter (comma or semicolon)
      const firstLine = text.split('\n')[0]
      const delimiter = firstLine.includes(';') ? ';' : ','
      
      const lines = text.split('\n')
      const headers = lines[0].split(delimiter)

      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('variable'))
      const typeIndex = headers.findIndex(h => h.toLowerCase().includes('type'))
      const dateIndices = headers.map((h, i) => {
        const date = parseDate(h.trim())
        return date ? i : -1
      }).filter(i => i !== -1)

      if (nameIndex === -1 || typeIndex === -1) {
        throw new Error('CSV must contain name and type columns')
      }

      if (dateIndices.length === 0) {
        throw new Error('CSV must contain at least one date column')
      }

      const newVariables: Variable[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(delimiter).map(v => v.trim())
        const name = values[nameIndex]
        const type = values[typeIndex]?.toUpperCase()

        if (!name || !type) continue

        if (!isValidVariableType(type)) {
          throw new Error(`Invalid type "${type}" at line ${i + 1}. Must be ACTUAL, BUDGET, or INPUT.`)
        }

        // Process time series data
        const timeSeries: TimeSeriesData[] = []
        dateIndices.forEach((dateIndex) => {
          const rawValue = values[dateIndex]?.trim()
          
          if (rawValue) {
            // First try to parse as English format (dot as decimal separator)
            const englishValue = parseFloat(rawValue)
            
            if (!isNaN(englishValue)) {
              const date = parseDate(headers[dateIndex])
              if (date) {
                timeSeries.push({ date, value: englishValue })
              }
            } else {
              // If that fails, try German format (comma as decimal separator)
              const germanFormat = rawValue.replace(/\./g, '').replace(',', '.')
              const germanValue = parseFloat(germanFormat)
              if (!isNaN(germanValue)) {
                const date = parseDate(headers[dateIndex])
                if (date) {
                  timeSeries.push({ date, value: germanValue })
                }
              }
            }
          }
        })

        newVariables.push({
          id: crypto.randomUUID(),
          name,
          type: type as 'ACTUAL' | 'BUDGET' | 'INPUT',
          timeSeries: timeSeries
        })
      }

      if (newVariables.length === 0) {
        throw new Error('No valid data found in the CSV file')
      }

      setProcessedVariables(newVariables)
      setShowImportModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process CSV file')
    } finally {
      setIsUploading(false)
    }
  }, [])

  return {
    isUploading,
    error,
    processedVariables,
    setProcessedVariables,
    showImportModal,
    setShowImportModal,
    parseCSV
  }
}

// Re-export utils to avoid import issues
export const parseDate = (dateStr: string): Date | null => {
  // Import from the utils file
  const { parseDate } = require('./utils')
  return parseDate(dateStr)
}

export const isValidVariableType = (type: string): boolean => {
  // Import from the utils file
  const { isValidVariableType } = require('./utils')
  return isValidVariableType(type)
} 