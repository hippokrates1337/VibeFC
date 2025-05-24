'use client'

import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Variable } from '@/lib/store/variables'

interface VariableCardProps {
  variable: Variable
  onDelete: (variableId: string, variableName: string) => void
  onViewDetails: (variable: Variable) => void
}

export function VariableCard({ variable, onDelete, onViewDetails }: VariableCardProps): React.ReactNode {
  const handleCardClick = (): void => {
    onViewDetails(variable)
  }

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation() // Prevent card click when delete button is clicked
    onDelete(variable.id, variable.name)
  }

  // Sort time series data by date to ensure correct range display
  const sortedTimeSeries = [...variable.timeSeries].sort((a, b) => a.date.getTime() - b.date.getTime())
  const hasTimeSeriesData = sortedTimeSeries.length > 0

  return (
    <div 
      className="rounded-lg border border-slate-700 bg-slate-800 p-6 transition-colors hover:bg-slate-750 cursor-pointer relative" 
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold mb-2 text-slate-100">{variable.name}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8 p-0"
          onClick={handleDeleteClick}
          aria-label={`Delete variable ${variable.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-slate-400 mb-4">Type: {variable.type}</p>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-200">Time Series Range:</p>
        {hasTimeSeriesData ? (
          <p className="text-sm text-slate-400">
            {format(sortedTimeSeries[0].date, 'MM/yyyy')} - {format(sortedTimeSeries[sortedTimeSeries.length - 1].date, 'MM/yyyy')}
          </p>
        ) : (
          <p className="text-sm text-slate-400">No time series data</p>
        )}
        <p className="text-sm text-slate-400">
          {variable.timeSeries.length} data points
        </p>
      </div>
    </div>
  )
} 