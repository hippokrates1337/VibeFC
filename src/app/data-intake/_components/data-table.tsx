'use client'

import { useRef, useEffect, useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import styles from '../table.module.css'
import { type Variable, useVariableStore } from '@/lib/store/variables'
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

export function DataTable({ variables, dates, onDeleteClick }: DataTableProps) {
  // Add ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { setVariables } = useVariableStore()
  const [editingVariable, setEditingVariable] = useState<string | null>(null)
  const [editedName, setEditedName] = useState<string>('')

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
  const handleTypeChange = (id: string, newType: Variable['type']) => {
    const updatedVariables = variables.map(variable => 
      variable.id === id ? { ...variable, type: newType } : variable
    )
    setVariables(updatedVariables)
  }
  
  // Start editing a variable name
  const startEditing = (id: string, currentName: string) => {
    setEditingVariable(id)
    setEditedName(currentName)
  }
  
  // Confirm name change
  const confirmNameChange = (id: string) => {
    const updatedVariables = variables.map(variable => 
      variable.id === id ? { ...variable, name: editedName } : variable
    )
    setVariables(updatedVariables)
    setEditingVariable(null)
  }
  
  // Cancel name change
  const cancelNameChange = () => {
    setEditingVariable(null)
    setEditedName('')
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
                <tr 
                  key={variable.id}
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
                        onClick={() => startEditing(variable.id, variable.name)}
                      >
                        <Pencil size={16} />
                      </button>
                      
                      {editingVariable === variable.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-full"
                            autoFocus
                          />
                          <button 
                            className="text-green-600 hover:text-green-800 transition-colors"
                            onClick={() => confirmNameChange(variable.id)}
                            aria-label="Confirm name change"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-800 transition-colors"
                            onClick={cancelNameChange}
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
                      onValueChange={(value) => handleTypeChange(variable.id, value as Variable['type'])}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue placeholder={variable.type} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTUAL">ACTUAL</SelectItem>
                        <SelectItem value="BUDGET">BUDGET</SelectItem>
                        <SelectItem value="INPUT">INPUT</SelectItem>
                        <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
                      </SelectContent>
                    </Select>
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
  )
} 