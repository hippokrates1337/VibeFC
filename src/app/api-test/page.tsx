'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon, CheckCircleIcon, XCircleIcon, RotateCwIcon } from 'lucide-react'

interface EnvironmentData {
  server: any;
  client: {
    supabaseUrl: string;
    backendUrl: string;
    hasNextData: boolean;
    hasRuntimeConfig: boolean;
    windowEnv: any;
    runtimeConfig: any;
    directProcessEnv: {
      supabaseUrl: string;
      backendUrl: string;
    };
  };
}

export default function ApiTestPage() {
  const [envData, setEnvData] = useState<EnvironmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [responseData, setResponseData] = useState<any>(null)

  useEffect(() => {
    async function checkEnvironment() {
      try {
        // Check server-side environment
        const serverResponse = await fetch('/api/env-test')
        const serverData = await serverResponse.json()

        // Check client-side environment (bundled by Next.js)
        const clientData = {
          // These should be available if properly bundled by Next.js
          supabaseUrl: 
            (globalThis as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL || 
            (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL ||
            (window as any).__NEXT_RUNTIME_CONFIG__?.NEXT_PUBLIC_SUPABASE_URL ||
            'Not available in browser',
          backendUrl: 
            (globalThis as any).process?.env?.NEXT_PUBLIC_BACKEND_URL ||
            (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_BACKEND_URL ||
            (window as any).__NEXT_RUNTIME_CONFIG__?.NEXT_PUBLIC_BACKEND_URL ||
            'Not available in browser',
          hasNextData: !!(window as any).__NEXT_DATA__,
          hasRuntimeConfig: !!(window as any).__NEXT_RUNTIME_CONFIG__,
          windowEnv: (window as any).__NEXT_DATA__?.env || 'No env in __NEXT_DATA__',
          runtimeConfig: (window as any).__NEXT_RUNTIME_CONFIG__ || 'No runtime config',
          // Try to access process.env directly (should work after config fix)
          directProcessEnv: {
            supabaseUrl: typeof process !== 'undefined' ? (process.env?.NEXT_PUBLIC_SUPABASE_URL || 'undefined') : 'process undefined',
            backendUrl: typeof process !== 'undefined' ? (process.env?.NEXT_PUBLIC_BACKEND_URL || 'undefined') : 'process undefined'
          }
        }

        setEnvData({
          server: serverData,
          client: clientData
        })
      } catch (error) {
        console.error('Environment check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkEnvironment()
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

  if (loading) {
    return <div className="p-8">Loading environment data...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Current environment variables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>Server-Side Environment:</strong>
              <pre className="text-xs overflow-auto max-h-80 text-black">
                {JSON.stringify(envData?.server, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Client-Side Environment:</strong>
              <pre className="text-xs overflow-auto max-h-80 text-black">
                {JSON.stringify(envData?.client, null, 2)}
              </pre>
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