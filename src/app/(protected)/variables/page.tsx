'use client'

import Link from 'next/link'
import { useVariableStore, useSetSelectedOrganizationId, useFetchVariables } from '@/lib/store/variables'
import { useOrganizationStore } from '@/lib/store/organization'
import { format } from 'date-fns'
import { useMemo, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'

export default function VariablesPage() {
  const variables = useVariableStore(state => state.variables)
  const selectedOrganizationId = useVariableStore(state => state.selectedOrganizationId)
  const setSelectedOrganizationId = useSetSelectedOrganizationId()
  const fetchVariables = useFetchVariables()
  const currentOrganization = useOrganizationStore(state => state.currentOrganization)
  const { user, session } = useAuth()
  
  // Sync with organization store when organization changes
  useEffect(() => {
    const orgId = currentOrganization?.id || null
    
    // Update selected organization ID in variable store
    if (orgId !== selectedOrganizationId) {
      setSelectedOrganizationId(orgId)
    }
    
    // Fetch variables if needed
    if (orgId && user && session?.access_token) {
      fetchVariables(user.id, session.access_token)
    }
  }, [currentOrganization, setSelectedOrganizationId, selectedOrganizationId, fetchVariables, user, session])
  
  const filteredVariables = useMemo(() => {
    if (!selectedOrganizationId) {
      return variables
    }
    return variables.filter(variable => variable.organizationId === selectedOrganizationId)
  }, [variables, selectedOrganizationId])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Variables Overview</h1>
        <Link
          href="/data-intake"
          className="text-primary hover:text-primary/80 transition-colors"
        >
          Upload More Data
        </Link>
      </div>

      {filteredVariables.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {currentOrganization 
              ? `No variables uploaded yet for ${currentOrganization.name}.`
              : 'No variables uploaded yet or no organization selected.'}
          </p>
          <Link
            href="/data-intake"
            className="text-primary hover:text-primary/80 transition-colors mt-4 inline-block"
          >
            Go to Data Intake
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVariables.map((variable) => (
            <div
              key={variable.id}
              className="rounded-lg border bg-card p-6"
            >
              <h3 className="text-lg font-semibold mb-2">{variable.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">Type: {variable.type}</p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Time Series Range:</p>
                {variable.timeSeries.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {format(variable.timeSeries[0].date, 'MM/yyyy')} - {format(variable.timeSeries[variable.timeSeries.length - 1].date, 'MM/yyyy')}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {variable.timeSeries.length} data points
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 