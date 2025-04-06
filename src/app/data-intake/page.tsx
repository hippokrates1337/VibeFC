'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { parse, format } from 'date-fns'
import styles from './table.module.css'

interface Variable {
  id: string
  name: string
  description: string | null
  type: 'ACTUAL' | 'BUDGET'
}

interface TableData {
  headers: string[]
  rows: Array<Array<string | number | null>>
}

export default function DataIntake() {
  const [variables, setVariables] = useState<Variable[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableData, setTableData] = useState<TableData | null>(null)

  // Add ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Update first column width
  useEffect(() => {
    if (tableData) {
      const container = scrollContainerRef.current
      if (!container) return

      // Get the first column's actual width
      const firstColumn = container.querySelector('td:first-child') as HTMLTableCellElement
      if (firstColumn) {
        const width = firstColumn.offsetWidth
        container.style.setProperty('--first-column-width', `${width}px`)
      }
    }
  }, [tableData])

  const validateHeaders = (headers: string[]): boolean => {
    if (headers.length < 3) return false // At least variable, type, and one date
    if (headers[0].toLowerCase() !== 'variable') return false
    if (headers[1].toLowerCase() !== 'type') return false

    // Check if all columns after the second one contain valid dates
    for (let i = 2; i < headers.length; i++) {
      try {
        parse(headers[i], 'yyyy-MM-dd', new Date())
      } catch {
        try {
          parse(headers[i], 'dd.MM.yyyy', new Date())
        } catch {
          return false
        }
      }
    }
    return true
  }

  const formatNumber = (value: string | number | null): string => {
    if (value === null || value === '') return ''
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value
    if (isNaN(num)) return ''
    return num.toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = parse(dateStr, 'yyyy-MM-dd', new Date())
      return format(date, 'MM-yyyy')
    } catch {
      try {
        const date = parse(dateStr, 'dd.MM.yyyy', new Date())
        return format(date, 'MM-yyyy')
      } catch {
        return dateStr
      }
    }
  }

  const processCSV = (csvText: string): TableData | null => {
    // Try both delimiters
    const delimiters = [',', ';']
    let rows: string[][] = []
    
    for (const delimiter of delimiters) {
      try {
        rows = csvText.split('\n')
          .map(line => line.split(delimiter)
          .map(cell => cell.trim()))
          .filter(row => row.length > 1 && row.some(cell => cell !== ''))
        
        if (rows.length >= 2) break // Valid data found
      } catch {
        continue
      }
    }

    if (rows.length < 2) {
      setError('Invalid CSV format')
      return null
    }

    const headers = rows[0]
    
    if (!validateHeaders(headers)) {
      setError('Invalid headers format. First column must be "variable", second column must be "type", and subsequent columns must be valid dates')
      return null
    }

    // Process the data rows
    const processedRows = rows.slice(1).map(row => {
      return row.map((cell, index) => {
        // First two columns remain as strings
        if (index < 2) return cell || (index === 1 ? 'unknown' : '')
        
        // Convert numeric values (from third column onwards)
        if (cell === '') return null
        const value = parseFloat(cell.replace(',', '.'))
        return isNaN(value) ? null : value
      })
    })

    // Format the date headers
    const formattedHeaders = [
      headers[0],
      headers[1],
      ...headers.slice(2).map(date => formatDate(date))
    ]

    return {
      headers: formattedHeaders,
      rows: processedRows
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return
    setError(null)
    setIsUploading(true)
    
    const file = event.target.files[0]
    
    if (file.type !== 'text/csv') {
      setError('Please upload a CSV file')
      setIsUploading(false)
      return
    }

    try {
      const text = await file.text()
      const data = processCSV(text)
      
      if (data) {
        setTableData(data)
      }
    } catch (err) {
      setError('Error processing file')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Data Intake</h1>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          Back to Home
        </Link>
      </div>

      {/* File Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Data</h2>
        <div className="flex items-center space-x-4">
          <label className="relative cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            <span>Choose File</span>
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
          {isUploading && <span className="text-gray-600">Uploading...</span>}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Supported format: CSV
        </p>
        {error && (
          <p className="text-red-500 mt-2">{error}</p>
        )}
      </div>

      {/* Data Table */}
      {tableData && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Uploaded Data</h2>
          <div className={styles.tableContainer}>
            <div className={styles.scrollContainer} ref={scrollContainerRef}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {tableData.headers.map((header, index) => (
                      <th 
                        key={index} 
                        className={`${styles.headerCell} ${
                          index >= 2 ? styles.textCenter : styles.textLeft
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className={`${styles.row} ${rowIndex % 2 === 0 ? '' : styles.zebra}`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td 
                          key={cellIndex} 
                          className={`${styles.cell} ${
                            cellIndex >= 2 ? styles.numericCell : styles.textLeft
                          }`}
                        >
                          {cellIndex >= 2 ? formatNumber(cell) : cell}
                        </td>
                      ))}
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