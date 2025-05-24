import React from 'react'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UploadSection } from './upload-section'

interface LoadingStateProps {
  pageTitle: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({ pageTitle }) => {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-slate-100">{pageTitle}</h1>
        <div className="flex flex-col items-center justify-center p-8" data-testid="loading-indicator">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-slate-400">Loading variables...</p>
        </div>
      </div>
    </div>
  )
}

interface ErrorStateProps {
  pageTitle: string
  errorMessage: string
  onProcessCSV: (file: File) => Promise<void>
  isUploading: boolean
  error: string | null
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  pageTitle, 
  errorMessage, 
  onProcessCSV, 
  isUploading, 
  error 
}) => {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-slate-100">{pageTitle}</h1>
        <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
        <UploadSection
          onProcessCSV={onProcessCSV}
          isUploading={isUploading}
          error={error}
        />
      </div>
    </div>
  )
}

interface EmptyStateProps {
  message: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return (
    <div 
      className="mt-8 text-center p-8 bg-slate-800 rounded-lg border border-slate-700"
      data-testid="empty-state" 
    >
      <p className="text-slate-400">{message}</p>
    </div>
  )
} 