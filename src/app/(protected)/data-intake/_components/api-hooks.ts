import { useCallback, useState } from 'react'
import { type Variable, type TimeSeriesData, useFetchVariables } from '@/lib/store/variables'
import { useAuth } from '@/providers/auth-provider'
import { useOrganizationStore } from '@/lib/store/organization'
import { logger } from '@/lib/utils/logger'
import { parseVariablesCsv, type CsvImportOptions, type CsvImportResult, type ParsedVariable } from './csv-import'
import { toApiPoint } from './month-values'

interface ApiStatus {
  loading: boolean
  error: string | null
  success: boolean
}

export type ImportAction = 'add' | 'update' | 'skip'

/** What to do with one variable of an imported file. `update` merges months into `targetId`. */
export interface VariableImportDecision {
  variable: ParsedVariable
  action: ImportAction
  targetId?: string
}

export interface VariableDraft {
  name: string
  type: Variable['type']
  timeSeries: TimeSeriesData[]
}

const VARIABLES_URL = '/api/data-intake/variables'

const toApiValues = (points: Array<{ month: string; value: number | null }>) => points.map(toApiPoint)

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json()
    return data?.message || fallback
  } catch {
    return `${fallback} (${response.status})`
  }
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

  const send = useCallback(async (method: 'POST' | 'PUT' | 'DELETE', body: unknown, fallbackError: string): Promise<void> => {
    if (!session?.access_token) {
      throw new Error('Authentication token is missing. Please log in again.')
    }
    const response = await fetch(VARIABLES_URL, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(await errorMessage(response, fallbackError))
    }
  }, [session])

  /** Runs a save, then reloads the organization's variables from the server. */
  const runSave = useCallback(async (event: string, save: () => Promise<void>): Promise<boolean> => {
    setApiStatus({ loading: true, error: null, success: false })
    try {
      await save()
      if (user && session?.access_token) {
        await fetchVariables(user.id, session.access_token, { force: true })
      }
      setApiStatus({ loading: false, error: null, success: true })
      setTimeout(() => setApiStatus(prev => ({ ...prev, success: false })), 3000)
      return true
    } catch (error) {
      logger.error(`${event} failed:`, error)
      setApiStatus({ loading: false, error: error instanceof Error ? error.message : 'Saving failed', success: false })
      return false
    }
  }, [fetchVariables, session, user])

  const handleImportVariables = useCallback(async (decisions: VariableImportDecision[]): Promise<boolean> => {
    const toAdd = decisions.filter(d => d.action === 'add')
    const toUpdate = decisions.filter(d => d.action === 'update' && d.targetId)
    logger.info('variables.import.decisions-prepared', {
      addCount: toAdd.length,
      updateCount: toUpdate.length,
      skipCount: decisions.length - toAdd.length - toUpdate.length,
    })
    if (toAdd.length === 0 && toUpdate.length === 0) return true

    if (!user || !currentOrganization) {
      setApiStatus({ loading: false, error: 'User or organization context is missing. Cannot import variables.', success: false })
      return false
    }

    return runSave('variables.import', async () => {
      if (toAdd.length > 0) {
        await send('POST', {
          variables: toAdd.map(({ variable }) => ({
            id: crypto.randomUUID(),
            name: variable.name,
            type: variable.type,
            organization_id: currentOrganization.id,
            values: toApiValues(variable.points),
          })),
        }, 'Failed to save the new variables')
      }
      if (toUpdate.length > 0) {
        // Merge: the file's months are added or overwritten, all other months stay.
        await send('PUT', {
          variables: toUpdate.map(({ variable, targetId }) => ({ id: targetId, values: toApiValues(variable.points) })),
        }, 'Failed to update the existing variables')
      }
    })
  }, [currentOrganization, runSave, send, user])

  /** Variable editor: changed name/type, and the edited series replaces the stored one. */
  const handleUpdateVariable = useCallback(async (
    variableId: string,
    updateData: { name?: string; timeSeries?: TimeSeriesData[]; type?: Variable['type'] },
    organizationId: string | null
  ): Promise<boolean> => {
    if (!organizationId) {
      setApiStatus({ loading: false, error: 'Cannot update: Organization context is missing.', success: false })
      return false
    }
    return runSave('variables.update', () => send('PUT', {
      variables: [{
        id: variableId,
        ...(updateData.name !== undefined ? { name: updateData.name } : {}),
        ...(updateData.type !== undefined ? { type: updateData.type } : {}),
        ...(updateData.timeSeries !== undefined ? { values: toApiValues(updateData.timeSeries), replaceValues: true } : {}),
      }],
    }, 'Failed to update the variable'))
  }, [runSave, send])

  /** "New variable": create one variable by hand. */
  const handleCreateVariable = useCallback(async (draft: VariableDraft, organizationId: string | null): Promise<boolean> => {
    if (!organizationId) {
      setApiStatus({ loading: false, error: 'Cannot create: Organization context is missing.', success: false })
      return false
    }
    return runSave('variables.create', () => send('POST', {
      variables: [{
        id: crypto.randomUUID(),
        name: draft.name,
        type: draft.type,
        organization_id: organizationId,
        values: toApiValues(draft.timeSeries),
      }],
    }, 'Failed to create the variable'))
  }, [runSave, send])

  const handleDeleteVariable = useCallback(async (variableId: string, organizationId: string | null): Promise<void> => {
    if (!organizationId) {
      setApiStatus({ loading: false, error: 'Cannot delete: Organization context is missing.', success: false })
      return
    }
    const deleted = await runSave('variables.delete', () =>
      send('DELETE', { ids: [variableId], organizationId }, 'Failed to delete the variable'))
    if (deleted) {
      setVariables(variables.filter(variable => variable.id !== variableId))
    }
  }, [runSave, send, setVariables, variables])

  return {
    apiStatus,
    setApiStatus,
    handleImportVariables,
    handleDeleteVariable,
    handleUpdateVariable,
    handleCreateVariable,
  }
}

/** Reads an uploaded CSV and keeps its text, so the import dialog can re-read it with other formats. */
export const useCsvProcessor = () => {
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileText, setFileText] = useState<string>('')
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null)
  const [showImportModal, setShowImportModal] = useState<boolean>(false)
  const currentOrganization = useOrganizationStore(state => state.currentOrganization)

  const parseCSV = useCallback(async (file: File): Promise<void> => {
    setIsUploading(true)
    setError(null)
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Please upload a CSV file')
      }
      if (!currentOrganization?.id) {
        throw new Error('No organization selected. Please select an organization before uploading data.')
      }
      const text = await file.text()
      if (!text.trim()) {
        throw new Error('The uploaded file is empty')
      }
      const result = parseVariablesCsv(text)
      // A file without a usable header is reported here; everything else in the dialog.
      if (result.variables.length === 0 && result.errors.length > 0 && result.months.length === 0) {
        throw new Error(result.errors[0].message)
      }
      setFileName(file.name)
      setFileText(text)
      setImportResult(result)
      setShowImportModal(true)
    } catch (err) {
      logger.error('[parseCSV] Error processing CSV:', err)
      setError(err instanceof Error ? err.message : 'Failed to process CSV file')
    } finally {
      setIsUploading(false)
    }
  }, [currentOrganization])

  const reparse = useCallback((options: CsvImportOptions): void => {
    if (fileText) setImportResult(parseVariablesCsv(fileText, options))
  }, [fileText])

  return {
    isUploading,
    error,
    fileName,
    importResult,
    reparse,
    showImportModal,
    setShowImportModal,
    parseCSV
  }
}
