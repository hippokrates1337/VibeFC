'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon, CheckCircleIcon, XCircleIcon, RotateCwIcon } from 'lucide-react'

export default function ApiTestPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [responseData, setResponseData] = useState<any>(null)
  const [backendUrl, setBackendUrl] = useState<string | null>(null)

  useEffect(() => {
    // Try to fetch the BACKEND_URL from .env.local via a simple API endpoint
    const checkBackendUrl = async () => {
      try {
        const res = await fetch('/api/env-test')
        const data = await res.json()
        setBackendUrl(data.backendUrl || 'Not configured')
      } catch (e) {
        setBackendUrl('Error fetching environment configuration')
      }
    }

    checkBackendUrl()
  }, [])

  const handleTestApi = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    setResponseData(null)

    try {
      const userId = "frontend-user"
      console.log(`Testing API: /api/data-intake/variables/user/${userId}`)

      const response = await fetch(`/api/data-intake/variables/user/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store'
      })

      console.log('API response status:', response.status)

      const responseText = await response.text()
      console.log('API response text length:', responseText.length)

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response received from API')
      }

      try {
        const data = JSON.parse(responseText)
        console.log('Parsed response data:', data)
        setResponseData(data)
        setSuccess(true)
      } catch (e) {
        console.error('Failed to parse response JSON:', e)
        throw new Error('Failed to parse response data: ' + (e instanceof Error ? e.message : String(e)))
      }
    } catch (error) {
      console.error('API test failed:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Backend Configuration</CardTitle>
          <CardDescription>Current backend endpoint configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>BACKEND_URL:</strong> {backendUrl || 'Loading...'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variable API Test</CardTitle>
          <CardDescription>Test the connection to the backend API</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleTestApi} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <>
                <RotateCwIcon className="mr-2 h-4 w-4 animate-spin" />
                Testing API...
              </>
            ) : (
              'Test Variables API'
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">API connection successful</AlertDescription>
            </Alert>
          )}

          {responseData && (
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2 text-white">Response Data:</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                <pre className="text-xs overflow-auto max-h-80 text-black">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-gray-50 text-sm text-gray-600">
          <InfoIcon className="h-4 w-4 mr-2" />
          This page helps diagnose API connectivity issues
        </CardFooter>
      </Card>
    </div>
  )
} 