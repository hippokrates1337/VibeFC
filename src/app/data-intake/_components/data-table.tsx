'use client'

import { useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import styles from '../table.module.css'
import { type Variable } from '@/lib/store/variables'
import { formatDate, formatNumber } from './utils'

interface DataTableProps {
  variables: Variable[]
  dates: Date[]
  onDeleteClick: (id: string, name: string) => void
}

export function DataTable({ variables, dates, onDeleteClick }: DataTableProps) {
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
                      {variable.name}
                    </div>
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
  )
} 