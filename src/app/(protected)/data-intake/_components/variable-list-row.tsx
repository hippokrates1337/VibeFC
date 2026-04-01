'use client'

import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Variable } from '@/lib/store/variables'

interface VariableListRowProps {
  variable: Variable
  onDelete: (variableId: string, variableName: string) => void
  onViewDetails: (variable: Variable) => void
}

export function VariableListRow({ variable, onDelete, onViewDetails }: VariableListRowProps): React.ReactNode {
  const handleRowClick = (): void => {
    onViewDetails(variable)
  }

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    onDelete(variable.id, variable.name)
  }

  const sortedTimeSeries = [...variable.timeSeries].sort((a, b) => a.date.getTime() - b.date.getTime())
  const hasTimeSeriesData = sortedTimeSeries.length > 0

  const rangeText = hasTimeSeriesData
    ? `${format(sortedTimeSeries[0].date, 'MM/yyyy')} – ${format(sortedTimeSeries[sortedTimeSeries.length - 1].date, 'MM/yyyy')}`
    : 'No time series data'

  return (
    <div
      data-testid="variable-item"
      className="flex items-center gap-3 rounded-md border border-slate-700/80 bg-slate-800/60 px-3 py-2.5 transition-colors hover:bg-slate-750 cursor-pointer"
      onClick={handleRowClick}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-100">{variable.name}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          <span className="text-slate-500">{variable.type}</span>
          <span className="mx-1.5 text-slate-600" aria-hidden="true">
            ·
          </span>
          <span>{rangeText}</span>
          <span className="mx-1.5 text-slate-600" aria-hidden="true">
            ·
          </span>
          <span>{variable.timeSeries.length} data points</span>
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8 p-0"
        onClick={handleDeleteClick}
        aria-label={`Delete variable ${variable.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
