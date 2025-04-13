'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useVariableStore, type Variable, type TimeSeriesData } from '@/lib/store/variables'
import { ImportModal } from './import-modal'
import { DeleteConfirmationModal } from './delete-confirmation-modal'
import { DataTable } from './_components/data-table'
import { UploadSection } from './_components/upload-section'
import { parseDate, isValidVariableType } from './_components/utils'

export default function DataIntake(): React.ReactNode {
  const { variables, setVariables } = useVariableStore()
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [processedVariables, setProcessedVariables] = useState<Variable[]>([])
  const [showImportModal, setShowImportModal] = useState<boolean>(false)
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

  const handleProcessCSV = useCallback(async (file: File): Promise<void> => {
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

  const handleImportConfirm = useCallback((decisions: { variable: Variable, action: 'add' | 'update' | 'skip', replaceId?: string }[]): void => {
    const newVariables = [...variables]
    
    decisions.forEach(({ variable, action, replaceId }) => {
      if (action === 'add') {
        newVariables.push(variable)
      } else if (action === 'update' && replaceId) {
        const index = newVariables.findIndex(v => v.id === replaceId)
        if (index !== -1) {
          newVariables[index] = { ...variable, id: replaceId }
        }
      }
      // Skip if action is 'skip'
    })
    
    setVariables(newVariables)
    setProcessedVariables([])
  }, [variables, setVariables])

  const handleDeleteClick = useCallback((id: string, name: string): void => {
    setDeleteConfirmation({
      isOpen: true,
      variableId: id,
      variableName: name
    })
  }, [])

  const handleDeleteVariable = useCallback((): void => {
    // Remove the variable with the given id
    const updatedVariables = variables.filter(variable => variable.id !== deleteConfirmation.variableId)
    setVariables(updatedVariables)
    closeDeleteConfirmation()
  }, [variables, deleteConfirmation.variableId, setVariables])

  const closeDeleteConfirmation = useCallback((): void => {
    setDeleteConfirmation({
      isOpen: false,
      variableId: '',
      variableName: ''
    })
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Data Intake</h1>
        <Link
          href="/"
          className="text-primary hover:text-primary/80 transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <div className="space-y-6">
        <UploadSection 
          isUploading={isUploading} 
          error={error} 
          onProcessCSV={handleProcessCSV} 
        />

        <ImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false)
            setProcessedVariables([])
          }}
          newVariables={processedVariables}
          existingVariables={variables}
          onConfirm={handleImportConfirm}
        />

        <DeleteConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={closeDeleteConfirmation}
          variableName={deleteConfirmation.variableName}
          onConfirm={handleDeleteVariable}
        />
      </div>

      {/* Data Table */}
      {variables.length > 0 && dates.length > 0 && (
        <DataTable 
          variables={variables}
          dates={dates}
          onDeleteClick={handleDeleteClick}
        />
      )}
    </div>
  )
} 