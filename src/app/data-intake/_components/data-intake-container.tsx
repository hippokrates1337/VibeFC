import { useMemo, useState, useCallback } from 'react'
import { useVariableStore } from '@/lib/store/variables'
import { ImportModal } from '../import-modal'
import { DeleteConfirmationModal } from '../delete-confirmation-modal'
import { DataTable } from './data-table'
import { UploadSection } from './upload-section'
import { useVariableApi, useCsvProcessor } from './api-hooks'
import { ApiStatus } from './data-status'
import { LoadingState, ErrorState, EmptyState } from './state-display'

export const DataIntakeContainer = () => {
  const { variables, setVariables, isLoading, error: storeError, fetchVariables } = useVariableStore()
  
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

  const dates = useMemo(() => {
    const allDates = variables.flatMap(variable => 
      variable.timeSeries.map(ts => ts.date)
    )
    
    // Group dates by their time value (ignoring hour/minute/second)
    const dateMap = new Map<number, Date>()
    allDates.forEach(date => {
      // Create a new date with just the year and month to handle month duplicates
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), 1)
      const timeValue = normalizedDate.getTime()
      
      if (!dateMap.has(timeValue)) {
        dateMap.set(timeValue, normalizedDate)
      }
    })
    
    // Convert map values back to array and sort
    return Array.from(dateMap.values())
      .sort((a, b) => a.getTime() - b.getTime())
  }, [variables])

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
    handleDeleteVariable(deleteConfirmation.variableId)
    closeDeleteConfirmation()
  }, [deleteConfirmation.variableId, handleDeleteVariable, closeDeleteConfirmation])

  // Render loading state
  if (isLoading) {
    return <LoadingState pageTitle="Data Intake" />
  }

  // Render error state
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

  // Main return statement
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Data Intake</h1>
      
      <ApiStatus success={apiStatus.success} error={apiStatus.error} />

      <UploadSection
        onProcessCSV={parseCSV}
        isUploading={isUploading}
        error={error}
      />

      {!variables.length ? (
        <EmptyState message="No variables found. Upload a CSV file to get started." />
      ) : (
        <div className="mt-8">
          <DataTable
            variables={variables}
            dates={dates}
            onDeleteClick={handleDeleteClick}
            onUpdateVariable={handleUpdateVariable}
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