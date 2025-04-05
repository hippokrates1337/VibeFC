'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Variable {
  id: string
  name: string
  description: string | null
  type: 'ACTUAL' | 'BUDGET'
}

export default function DataIntake() {
  const [variables, setVariables] = useState<Variable[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return

    setIsUploading(true)
    const file = event.target.files[0]
    
    // TODO: Implement file upload logic
    console.log('File selected:', file.name)
    
    setIsUploading(false)
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
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
          {isUploading && <span className="text-gray-600">Uploading...</span>}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Supported formats: CSV, Excel (.xlsx)
        </p>
      </div>

      {/* Variables List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Imported Variables</h2>
        {variables.length === 0 ? (
          <p className="text-gray-600">No variables imported yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {variables.map((variable) => (
              <div
                key={variable.id}
                className="border p-4 rounded-lg"
              >
                <h3 className="font-semibold">{variable.name}</h3>
                {variable.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {variable.description}
                  </p>
                )}
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-gray-100">
                  {variable.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 