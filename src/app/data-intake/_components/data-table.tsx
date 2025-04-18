'use client'

import { useRef, useEffect, useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import styles from './table.module.css'
import { type Variable, type TimeSeriesData, useVariableStore } from '@/lib/store/variables'
import { formatDate, formatNumber } from './utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTableProps {
  variables: Variable[]
  dates: Date[]
  onDeleteClick: (id: string, name: string) => void
}

// Interface for tracking which cell is being edited
interface EditingCell {
  variableId: string | null
  dateIndex: number | null
}

// Utility function to parse number input with international notation
// (uses "." as decimal separator and "," as thousand separator)
const parseNumberInput = (value: string): number | null => {
  if (!value || value.trim() === '') return null
  
  // Remove thousand separators and keep the decimal separator
  const normalized = value
    .replace(/\s/g, '')     // Remove any whitespace
    .replace(/,/g, '')      // Remove commas (thousand separators in international format)
  
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? null : parsed
}

// Format number to international format for display in edit field
const formatNumberForEdit = (value: number | null): string => {
  if (value === null) return ''
  // Format without thousand separators for editing
  return value.toString()
}

export function DataTable({ variables, dates, onDeleteClick }: DataTableProps): React.ReactNode {
  // Add ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { setVariables } = useVariableStore()
  const [editingVariable, setEditingVariable] = useState<string | null>(null)
  const [editedName, setEditedName] = useState<string>('')
  // State for tracking which cell is being edited and its value
  const [editingCell, setEditingCell] = useState<EditingCell>({ variableId: null, dateIndex: null })
  const [editedValue, setEditedValue] = useState<string>('')

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

  // Handle variable type change
  const handleTypeChange = (id: string, newType: Variable['type']): void => {
    const updatedVariables = variables.map(variable => 
      variable.id === id ? { ...variable, type: newType } : variable
    )
    setVariables(updatedVariables)
  }
  
  // Start editing a variable name
  const startEditing = (id: string, currentName: string): void => {
    setEditingVariable(id)
    setEditedName(currentName)
  }
  
  // Confirm name change
  const confirmNameChange = (id: string): void => {
    const updatedVariables = variables.map(variable => 
      variable.id === id ? { ...variable, name: editedName } : variable
    )
    setVariables(updatedVariables)
    setEditingVariable(null)
  }
  
  // Cancel name change
  const cancelNameChange = (): void => {
    setEditingVariable(null)
    setEditedName('')
  }
  
  // Start editing a value
  const startEditingValue = (variableId: string, dateIndex: number, currentValue: number | null): void => {
    setEditingCell({ variableId, dateIndex })
    setEditedValue(formatNumberForEdit(currentValue))
  }
  
  // Confirm value change
  const confirmValueChange = (variableId: string, dateIndex: number): void => {
    const date = dates[dateIndex]
    const parsedValue = parseNumberInput(editedValue)
    
    if (parsedValue === null && editedValue !== '') {
      // If input is not a valid number and not empty, don't update
      cancelValueChange()
      return
    }
    
    const updatedVariables = variables.map(variable => {
      if (variable.id !== variableId) return variable
      
      // Get a copy of the time series
      const updatedTimeSeries = [...variable.timeSeries]
      
      // Find the entry with matching date
      const entryIndex = updatedTimeSeries.findIndex(
        ts => ts.date.getTime() === date.getTime()
      )
      
      if (entryIndex >= 0) {
        // Update existing entry
        updatedTimeSeries[entryIndex] = {
          ...updatedTimeSeries[entryIndex],
          value: parsedValue
        }
      } else if (parsedValue !== null) {
        // Add new entry if value is not empty
        updatedTimeSeries.push({
          date,
          value: parsedValue
        })
      }
      
      return {
        ...variable,
        timeSeries: updatedTimeSeries
      }
    })
    
    setVariables(updatedVariables)
    cancelValueChange()
  }
  
  // Cancel value editing
  const cancelValueChange = (): void => {
    setEditingCell({ variableId: null, dateIndex: null })
    setEditedValue('')
  }
  
  return (
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
                <TableRow
                  key={variable.id}
                  variable={variable}
                  rowIndex={rowIndex}
                  dates={dates}
                  editingVariable={editingVariable}
                  editedName={editedName}
                  editingCell={editingCell}
                  editedValue={editedValue}
                  onDeleteClick={onDeleteClick}
                  onTypeChange={handleTypeChange}
                  onStartEditing={startEditing}
                  onConfirmNameChange={confirmNameChange}
                  onCancelNameChange={cancelNameChange}
                  onStartEditingValue={startEditingValue}
                  onConfirmValueChange={confirmValueChange}
                  onCancelValueChange={cancelValueChange}
                  setEditedName={setEditedName}
                  setEditedValue={setEditedValue}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface TableRowProps {
  variable: Variable
  rowIndex: number
  dates: Date[]
  editingVariable: string | null
  editedName: string
  editingCell: EditingCell
  editedValue: string
  onDeleteClick: (id: string, name: string) => void
  onTypeChange: (id: string, newType: Variable['type']) => void
  onStartEditing: (id: string, currentName: string) => void
  onConfirmNameChange: (id: string) => void
  onCancelNameChange: () => void
  onStartEditingValue: (variableId: string, dateIndex: number, currentValue: number | null) => void
  onConfirmValueChange: (variableId: string, dateIndex: number) => void
  onCancelValueChange: () => void
  setEditedName: React.Dispatch<React.SetStateAction<string>>
  setEditedValue: React.Dispatch<React.SetStateAction<string>>
}

function TableRow({
  variable,
  rowIndex,
  dates,
  editingVariable,
  editedName,
  editingCell,
  editedValue,
  onDeleteClick,
  onTypeChange,
  onStartEditing,
  onConfirmNameChange,
  onCancelNameChange,
  onStartEditingValue,
  onConfirmValueChange,
  onCancelValueChange,
  setEditedName,
  setEditedValue
}: TableRowProps): React.ReactNode {
  return (
    <tr 
      className={`${styles.row} ${rowIndex % 2 === 0 ? '' : styles.zebra}`}
    >
      <td className={`${styles.cell} ${styles.textLeft}`}>
        <div className="flex items-center gap-2">
          <button 
            className="text-gray-400 hover:text-red-500 transition-colors" 
            aria-label={`Delete ${variable.name}`}
            onClick={() => onDeleteClick(variable.id, variable.name)}
          >
            <Trash2 size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-blue-500 transition-colors" 
            aria-label={`Edit ${variable.name}`}
            onClick={() => onStartEditing(variable.id, variable.name)}
          >
            <Pencil size={16} />
          </button>
          
          {editingVariable === variable.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="border rounded px-2 py-1 text-sm w-full text-gray-900 bg-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onConfirmNameChange(variable.id)
                  if (e.key === 'Escape') onCancelNameChange()
                }}
              />
              <button 
                className="text-green-600 hover:text-green-800 transition-colors"
                onClick={() => onConfirmNameChange(variable.id)}
                aria-label="Confirm name change"
              >
                <Check size={16} />
              </button>
              <button 
                className="text-red-600 hover:text-red-800 transition-colors"
                onClick={onCancelNameChange}
                aria-label="Cancel name change"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            variable.name
          )}
        </div>
      </td>
      <td className={`${styles.cell} ${styles.textCenter}`}>
        <Select
          defaultValue={variable.type}
          onValueChange={(value) => onTypeChange(variable.id, value as Variable['type'])}
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue>
              <VariableTypeBadge type={variable.type} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTUAL">
              <VariableTypeBadge type="ACTUAL" />
            </SelectItem>
            <SelectItem value="BUDGET">
              <VariableTypeBadge type="BUDGET" />
            </SelectItem>
            <SelectItem value="INPUT">
              <VariableTypeBadge type="INPUT" />
            </SelectItem>
          </SelectContent>
        </Select>
      </td>
      
      {dates.map((date, dateIndex) => (
        <DataCell
          key={dateIndex}
          variable={variable}
          date={date}
          dateIndex={dateIndex}
          editingCell={editingCell}
          editedValue={editedValue}
          onStartEditingValue={onStartEditingValue}
          onConfirmValueChange={onConfirmValueChange}
          onCancelValueChange={onCancelValueChange}
          setEditedValue={setEditedValue}
        />
      ))}
    </tr>
  )
}

interface DataCellProps {
  variable: Variable
  date: Date
  dateIndex: number
  editingCell: EditingCell
  editedValue: string
  onStartEditingValue: (variableId: string, dateIndex: number, currentValue: number | null) => void
  onConfirmValueChange: (variableId: string, dateIndex: number) => void
  onCancelValueChange: () => void
  setEditedValue: React.Dispatch<React.SetStateAction<string>>
}

function DataCell({
  variable,
  date,
  dateIndex,
  editingCell,
  editedValue,
  onStartEditingValue,
  onConfirmValueChange,
  onCancelValueChange,
  setEditedValue
}: DataCellProps): React.ReactNode {
  // Find value for this date if exists
  const timeSeriesEntry = variable.timeSeries.find(
    ts => ts.date.getTime() === date.getTime()
  )
  
  const value = timeSeriesEntry?.value ?? null
  const isEditing = editingCell.variableId === variable.id && editingCell.dateIndex === dateIndex
  
  return (
    <td className={`${styles.cell} ${styles.numericCell}`}>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-20 text-right"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmValueChange(variable.id, dateIndex)
              if (e.key === 'Escape') onCancelValueChange()
            }}
          />
          <div className="flex flex-col">
            <button 
              className="text-green-600 hover:text-green-800 transition-colors"
              onClick={() => onConfirmValueChange(variable.id, dateIndex)}
              aria-label="Confirm value change"
            >
              <Check size={14} />
            </button>
            <button 
              className="text-red-600 hover:text-red-800 transition-colors"
              onClick={onCancelValueChange}
              aria-label="Cancel value change"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="cursor-pointer hover:underline hover:text-blue-600 transition-colors"
          onClick={() => onStartEditingValue(variable.id, dateIndex, value)}
        >
          {value !== null ? formatNumber(value) : '—'}
        </div>
      )}
    </td>
  )
}

interface VariableTypeBadgeProps {
  type: Variable['type']
}

function VariableTypeBadge({ type }: VariableTypeBadgeProps): React.ReactNode {
  const badgeClasses = {
    ACTUAL: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    BUDGET: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    INPUT: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20',
    UNKNOWN: 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20'
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${badgeClasses[type]}`}>
      {type}
    </span>
  )
} 