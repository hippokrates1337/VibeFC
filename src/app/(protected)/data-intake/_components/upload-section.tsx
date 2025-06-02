'use client'

import { ChangeEvent, useState } from 'react'

interface UploadSectionProps {
  isUploading: boolean
  error: string | null
  onProcessCSV: (file: File) => void
}

export function UploadSection({ isUploading, error, onProcessCSV }: UploadSectionProps): React.ReactNode {
  const [dragActive, setDragActive] = useState<boolean>(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      // Let the parent component handle the error display
      onProcessCSV(file) // The parent will detect this is not a CSV
      return
    }
    
    onProcessCSV(file)
  }
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      onProcessCSV(file)
    }
  }
  
  return (
    <div 
      className={`rounded-lg border p-6 ${dragActive ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800 border-slate-700'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2 className="text-xl font-semibold mb-4 text-slate-100">Upload Data</h2>
      <div className="flex items-center space-x-4">
        <label className="relative cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
          <span>Choose File</span>
          <input
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
            data-testid="csv-upload-input"
          />
        </label>
        {isUploading && <span className="text-slate-400">Uploading...</span>}
      </div>
      <p className="text-sm text-slate-400 mt-2">
        Supported format: CSV with columns for Variable, Type, and Dates (drag and drop supported)
      </p>
      {error && (
        <p className="text-red-400 mt-2">{error}</p>
      )}
    </div>
  )
} 