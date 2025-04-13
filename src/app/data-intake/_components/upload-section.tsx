'use client'

import { ChangeEvent } from 'react'

interface UploadSectionProps {
  isUploading: boolean
  error: string | null
  onProcessCSV: (file: File) => void
}

export function UploadSection({ isUploading, error, onProcessCSV }: UploadSectionProps) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onProcessCSV(file)
    }
  }
  
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Data</h2>
      <div className="flex items-center space-x-4">
        <label className="relative cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
          <span>Choose File</span>
          <input
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
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
  )
} 