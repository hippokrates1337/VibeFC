import React from 'react'

interface ApiStatusProps {
  success: boolean
  error: string | null
}

export const ApiStatus: React.FC<ApiStatusProps> = ({ success, error }) => {
  if (!success && !error) return null

  return (
    <>
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">Variables saved successfully.</span>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
    </>
  )
} 