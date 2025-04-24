import React from 'react'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UploadSection } from './upload-section'

interface LoadingStateProps {
  pageTitle: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({ pageTitle }) => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{pageTitle}</h1>
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="mt-4 text-gray-500">Loading variables...</p>
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{pageTitle}</h1>
      <Alert variant="destructive" className="mb-4">
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
  )
}

interface EmptyStateProps {
  message: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return (
    <div className="mt-8 text-center p-8 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-gray-500">{message}</p>
    </div>
  )
} 