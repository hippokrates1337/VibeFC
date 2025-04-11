'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { parse, format } from 'date-fns'
import styles from './table.module.css'
import { useVariableStore, type Variable, type TimeSeriesData } from '@/lib/store/variables'
import { ImportModal } from './import-modal'

export default function DataIntake() {
  const { variables, setVariables } = useVariableStore()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processedVariables, setProcessedVariables] = useState<Variable[]>([])
  const [showImportModal, setShowImportModal] = useState(false)

  const dates = useMemo(() => {
    const allDates = variables.flatMap(variable => 
      variable.timeSeries.map(ts => ts.date)
    )
    
    // Remove duplicates and sort
    return Array.from(new Set(allDates))
      .sort((a, b) => a.getTime() - b.getTime())
  }, [variables])

  // Add ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Update first column width
  useEffect(() => {
    if (variables.length > 0) {
      const container = scrollContainerRef.current
      if (!container) return

      // Get the first column's actual width
      const firstColumn = container.querySelector('td:first-child') as HTMLTableCellElement
      if (firstColumn) {
        const width = firstColumn.offsetWidth
        container.style.setProperty('--first-column-width', `${width}px`)
      }
    }
  }, [variables])

  const parseDate = (dateStr: string): Date | null => {
    const formats = [
      'yyyy-MM-dd',    // ISO format
      'dd.MM.yyyy',    // German format
      'MM/dd/yyyy',    // US format
      'dd/MM/yyyy',    // UK format
      'yyyy.MM.dd',    // Alternative ISO format
      'MM.yyyy',       // Short German format
      'MM/yyyy',       // Short US/UK format
      'yyyy-MM',       // Short ISO format
    ]

    for (const format of formats) {
      try {
        const date = parse(dateStr.trim(), format, new Date())
        if (!isNaN(date.getTime())) {
          return date
        }
      } catch {
        continue
      }
    }
    return null
  }

  const validateHeaders = (headers: string[]): boolean => {
    if (headers.length < 3) return false // At least variable, type, and one date
    if (headers[0].toLowerCase() !== 'variable') return false
    if (headers[1].toLowerCase() !== 'type') return false

    // Check if all columns after the second one contain valid dates
    for (let i = 2; i < headers.length; i++) {
      const date = parseDate(headers[i])
      if (!date) {
        setError(`Invalid date format in column ${i + 1}. Expected yyyy-MM-dd or dd.MM.yyyy`)
        return false
      }
    }
    return true
  }

  const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date object:', date)
      return 'Invalid Date'
    }
    return format(date, 'MM-yyyy')
  }

  const formatNumber = (value: number | null): string => {
    if (value === null) return ''
    return value.toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
  }

  const isValidVariableType = (type: string): type is Variable['type'] => {
    return ['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN'].includes(type.toUpperCase() as Variable['type'])
  }

  const processCSV = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      const text = await file.text()
      
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

        if (!['ACTUAL', 'BUDGET', 'INPUT'].includes(type)) {
          throw new Error(`Invalid type "${type}" at line ${i + 1}. Must be ACTUAL, BUDGET, or INPUT.`)
        }

        // Process time series data
        const timeSeries: TimeSeriesData[] = []
        dateIndices.forEach((dateIndex, idx) => {
          const rawValue = values[dateIndex]?.trim()
          
          if (rawValue) {
            // Try German format first (comma as decimal separator)
            const germanFormat = rawValue.replace('.', '').replace(',', '.')
            const germanValue = parseFloat(germanFormat)
            
            if (!isNaN(germanValue)) {
              const date = parseDate(headers[dateIndex])
              if (date) {
                timeSeries.push({ date, value: germanValue })
              }
            } else {
              // Try English format (dot as decimal separator)
              const englishValue = parseFloat(rawValue)
              if (!isNaN(englishValue)) {
                const date = parseDate(headers[dateIndex])
                if (date) {
                  timeSeries.push({ date, value: englishValue })
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

      setProcessedVariables(newVariables)
      setShowImportModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process CSV file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleImportConfirm = (decisions: { variable: Variable, action: 'add' | 'update' | 'skip', replaceId?: string }[]) => {
    const newVariables = [...variables]
    
    decisions.forEach(({ variable, action, replaceId }) => {
      if (action === 'add') {
        newVariables.push(variable)
      } else if (action === 'update' && replaceId) {
        const index = newVariables.findIndex(v => v.id === replaceId)
        if (index !== -1) {
          newVariables[index] = variable
        }
      }
      // Skip if action is 'skip'
    })
    
    setVariables(newVariables)
    setProcessedVariables([])
  }

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
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Data</h2>
          <div className="flex items-center space-x-4">
            <label className="relative cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
              <span>Choose File</span>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    processCSV(file)
                  }
                }}
                disabled={isUploading}
              />
            </label>
            {isUploading && <span className="text-muted-foreground">Uploading...</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Supported format: CSV
          </p>
          {error && (
            <p className="text-destructive mt-2">{error}</p>
          )}
        </div>

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
      </div>

      {/* Data Table */}
      {variables.length > 0 && dates.length > 0 && (
        <div className="rounded-lg border bg-card p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Uploaded Data</h2>
          <div className={styles.tableContainer}>
            <div className={styles.scrollContainer} ref={scrollContainerRef}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.headerCell} ${styles.textLeft}`}>
                      Variable
                    </th>
                    <th className={`${styles.headerCell} ${styles.textCenter}`}>
                      Type
                    </th>
                    {dates.map((date, index) => (
                      <th 
                        key={index}
                        className={`${styles.headerCell} ${styles.textCenter}`}
                      >
                        {formatDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variables.map((variable, rowIndex) => (
                    <tr 
                      key={variable.id}
                      className={`${styles.row} ${rowIndex % 2 === 0 ? '' : styles.zebra}`}
                    >
                      <td className={`${styles.cell} ${styles.textLeft}`}>
                        {variable.name}
                      </td>
                      <td className={`${styles.cell} ${styles.textCenter}`}>
                        {variable.type}
                      </td>
                      {dates.map((date, index) => {
                        const timeSeriesEntry = variable.timeSeries.find(
                          ts => ts.date.getTime() === date.getTime()
                        )
                        return (
                          <td 
                            key={index}
                            className={`${styles.cell} ${styles.numericCell}`}
                          >
                            {formatNumber(timeSeriesEntry?.value ?? null)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 