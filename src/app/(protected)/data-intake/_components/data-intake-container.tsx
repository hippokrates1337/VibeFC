import { useMemo, useState, useCallback, useEffect } from 'react'
import { 
  useVariableStore,
  useSetSelectedOrganizationId,
  useIsVariablesLoading,
  useFetchVariables,
  useVariableError,
  Variable
} from '@/lib/store/variables' 
import { useOrganizationStore } from '@/lib/store/organization';
import { ImportModal } from '../import-modal'
import { DeleteConfirmationModal } from '../delete-confirmation-modal'
import { DataTable } from './data-table'
import { UploadSection } from './upload-section'
import { useVariableApi, useCsvProcessor } from './api-hooks'
import { ApiStatus } from './data-status'
import { LoadingState, ErrorState, EmptyState } from './state-display'
import { useAuth } from '@/providers/auth-provider'
import { logger } from '@/lib/utils/logger'

export const DataIntakeContainer = () => {
  const variables = useVariableStore(state => state.variables);
  const selectedOrganizationId = useVariableStore(state => state.selectedOrganizationId);
  const setVariables = useVariableStore((state) => state.setVariables);

  const filteredVariables = useMemo(() => {
    if (!selectedOrganizationId) {
      return variables;
    }
    logger.log('[DataIntakeContainer useMemo] Filtering variables for organization:', selectedOrganizationId);
    return (variables || []).filter(variable => variable.organizationId === selectedOrganizationId);
  }, [variables, selectedOrganizationId]);

  const setSelectedOrganizationIdInStore = useSetSelectedOrganizationId();
  const storeIsLoading = useIsVariablesLoading();
  const storeError = useVariableError();
  const fetchVariables = useFetchVariables();
  
  const { user, session, isLoading: authIsLoading } = useAuth()
  const currentOrganization = useOrganizationStore(state => state.currentOrganization);
  const selectedOrgIdFromOrgStore = currentOrganization?.id || null;

  const {
    apiStatus,
    handleImportVariables,
    handleDeleteVariable,
    handleUpdateVariable
  } = useVariableApi(variables, setVariables)
  
  const {
    isUploading,
    error,
    processedVariables,
    setProcessedVariables,
    showImportModal,
    setShowImportModal,
    parseCSV
  } = useCsvProcessor(variables)

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    variableId: string;
    variableName: string;
  }>({
    isOpen: false,
    variableId: '',
    variableName: ''
  })

  useEffect(() => {
    logger.log('[DataIntakeContainer useEffect] Org ID from store changed to:', selectedOrgIdFromOrgStore);
    // Update the selected ID in the variable store
    setSelectedOrganizationIdInStore(selectedOrgIdFromOrgStore);
    
    // Trigger fetch ONLY if we have a selected org, user, and token
    if (selectedOrgIdFromOrgStore && user && session?.access_token) {
      logger.log('[DataIntakeContainer useEffect] Triggering fetchVariables for org:', selectedOrgIdFromOrgStore);
      // Let the store handle the logic of whether to actually fetch (based on existing data/loading state)
      fetchVariables(user.id, session.access_token);
    } else {
       logger.log('[DataIntakeContainer useEffect] Skipping fetchVariables - missing orgId, user, or token.');
       // Optionally clear variables if no org is selected?
       // useVariableStore.getState().clearVariables(); // Decide if this is desired behaviour
    }
  }, [selectedOrgIdFromOrgStore, setSelectedOrganizationIdInStore, fetchVariables, user, session?.access_token]);

  const dates = useMemo(() => {
    const allDates = filteredVariables.flatMap(variable => 
      variable.timeSeries.map(ts => ts.date)
    )
    
    const dateMap = new Map<number, Date>()
    allDates.forEach(date => {
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), 1)
      const timeValue = normalizedDate.getTime()
      
      if (!dateMap.has(timeValue)) {
        dateMap.set(timeValue, normalizedDate)
      }
    })
    
    return Array.from(dateMap.values())
      .sort((a, b) => a.getTime() - b.getTime())
  }, [filteredVariables])

  const handleDeleteClick = useCallback((id: string, name: string): void => {
    setDeleteConfirmation({
      isOpen: true,
      variableId: id,
      variableName: name
    })
  }, [])

  const closeDeleteConfirmation = useCallback((): void => {
    setDeleteConfirmation({
      isOpen: false,
      variableId: '',
      variableName: ''
    })
  }, [])

  const handleConfirmDelete = useCallback((): void => {
    logger.log('[handleConfirmDelete] Org ID being passed:', selectedOrgIdFromOrgStore); 
    handleDeleteVariable(deleteConfirmation.variableId, selectedOrgIdFromOrgStore) 
    closeDeleteConfirmation()
  }, [deleteConfirmation.variableId, handleDeleteVariable, closeDeleteConfirmation, selectedOrgIdFromOrgStore])

  if (storeIsLoading || authIsLoading) {
    return <LoadingState pageTitle="Data Intake" />
  }

  if (storeError) {
    return (
      <ErrorState 
        pageTitle="Data Intake"
        errorMessage={storeError}
        onProcessCSV={parseCSV}
        isUploading={isUploading}
        error={error}
      />
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Data Intake</h1>
      
      <ApiStatus success={apiStatus.success} error={apiStatus.error} />

      <UploadSection
        onProcessCSV={parseCSV}
        isUploading={isUploading}
        error={error}
      />

      {!filteredVariables.length && !storeIsLoading ? (
        <EmptyState message="No variables found for the selected organization, or no organization selected. Upload a CSV file or select an organization." />
      ) : (
        <div className="mt-8">
          <DataTable
            variables={filteredVariables}
            dates={dates}
            onDeleteClick={handleDeleteClick}
            onUpdateVariable={(variableId, updateData) => handleUpdateVariable(variableId, updateData, selectedOrgIdFromOrgStore)}
          />
        </div>
      )}

      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          newVariables={processedVariables}
          existingVariables={variables}
          onConfirm={handleImportVariables}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        variableName={deleteConfirmation.variableName}
        onClose={closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
} 