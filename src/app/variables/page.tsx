'use client'

import Link from 'next/link'
import { useVariableStore } from '@/lib/store/variables'
import { format } from 'date-fns'

export default function VariablesPage() {
  const { variables } = useVariableStore()

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

      {variables.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No variables uploaded yet.</p>
          <Link
            href="/data-intake"
            className="text-primary hover:text-primary/80 transition-colors mt-4 inline-block"
          >
            Go to Data Intake
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {variables.map((variable) => (
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