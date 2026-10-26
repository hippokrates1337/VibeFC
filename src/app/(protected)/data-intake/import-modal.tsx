"use client"

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Variable } from '@/lib/store/variables'
import type { CsvImportOptions, CsvImportResult, DateOrder, DecimalSeparator, ParsedVariable } from './_components/csv-import'
import type { ImportAction, VariableImportDecision } from './_components/api-hooks'
import { formatMonthLabel, formatValue, monthRangeLabel } from './_components/month-values'

export type { ImportAction, VariableImportDecision }

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  result: CsvImportResult
  onReparse: (options: CsvImportOptions) => void
  /** Variables of the current organization (update targets). */
  existingVariables: Variable[]
  onConfirm: (decisions: VariableImportDecision[]) => Promise<boolean> | boolean | void
}

const PREVIEW_POINTS = 4
const MAX_ISSUES_SHOWN = 20

/** Same name (any case) updates the existing variable; prefer one of the same type. */
function defaultDecision(variable: ParsedVariable, existing: Variable[]): VariableImportDecision {
  const sameName = existing.filter(v => v.name.trim().toLowerCase() === variable.name.toLowerCase())
  const target = sameName.find(v => v.type === variable.type) ?? sameName[0]
  return target ? { variable, action: 'update', targetId: target.id } : { variable, action: 'add' }
}

export function ImportModal({
  isOpen,
  onClose,
  fileName,
  result,
  onReparse,
  existingVariables,
  onConfirm
}: ImportModalProps): React.ReactNode {
  const [choices, setChoices] = useState<Record<string, { action: ImportAction; targetId?: string }>>({})
  const [formatsConfirmed, setFormatsConfirmed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // New file: forget earlier choices
  useEffect(() => {
    setChoices({})
    setFormatsConfirmed(false)
  }, [fileName])

  const decisions = useMemo<VariableImportDecision[]>(
    () => result.variables.map(variable => {
      const choice = choices[variable.name]
      return choice ? { variable, ...choice } : defaultDecision(variable, existingVariables)
    }),
    [result.variables, choices, existingVariables]
  )

  const needsFormatChoice = result.decimal.ambiguous || result.dateOrder.ambiguous
  const missingTarget = decisions.some(d => d.action === 'update' && !d.targetId)
  const nothingToDo = decisions.every(d => d.action === 'skip')
  const blocked = result.errors.length > 0 || (needsFormatChoice && !formatsConfirmed) || missingTarget || nothingToDo
  const counts = {
    add: decisions.filter(d => d.action === 'add').length,
    update: decisions.filter(d => d.action === 'update').length,
    skip: decisions.filter(d => d.action === 'skip').length,
  }

  const setChoice = (name: string, choice: { action: ImportAction; targetId?: string }): void =>
    setChoices(prev => ({ ...prev, [name]: choice }))

  const reparse = (options: CsvImportOptions): void => {
    setFormatsConfirmed(true)
    onReparse({ decimal: result.decimal.value, dateOrder: result.dateOrder.value, ...options })
  }

  const handleConfirm = async (): Promise<void> => {
    setIsSaving(true)
    try {
      const saved = await onConfirm(decisions)
      if (saved !== false) onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const fileMonths = monthRangeLabel(result.months.map(month => ({ month })))

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !isSaving) onClose() }}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[90vw] flex flex-col gap-0 p-0 bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader className="px-6 py-4 border-b border-slate-700">
          <DialogTitle className="text-xl font-semibold text-slate-100">Import variables</DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            {fileName} · {result.variables.length} variables
            {fileMonths ? ` · ${result.months.length} months (${fileMonths})` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Formats */}
          <div className={`rounded-md border p-3 text-sm ${needsFormatChoice && !formatsConfirmed ? 'border-amber-500/60 bg-amber-950/30' : 'border-slate-700 bg-slate-900/40'}`}>
            {needsFormatChoice && !formatsConfirmed && (
              <p className="mb-2 text-amber-300" data-testid="format-question">
                The file does not show which {result.decimal.ambiguous ? 'number format' : ''}
                {result.decimal.ambiguous && result.dateOrder.ambiguous ? ' and ' : ''}
                {result.dateOrder.ambiguous ? 'date order' : ''} it uses. Check the values below, then confirm or change it.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-slate-300">Numbers</span>
                <Select value={result.decimal.value} onValueChange={(value) => reparse({ decimal: value as DecimalSeparator })}>
                  <SelectTrigger className="h-8 w-56 bg-slate-700 border-slate-600" aria-label="number format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-slate-100">
                    <SelectItem value="dot">1,234.56 (decimal point)</SelectItem>
                    <SelectItem value="comma">1.234,56 (decimal comma)</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              {result.dateOrder.relevant && (
                <label className="flex items-center gap-2">
                  <span className="text-slate-300">Dates</span>
                  <Select value={result.dateOrder.value} onValueChange={(value) => reparse({ dateOrder: value as DateOrder })}>
                    <SelectTrigger className="h-8 w-48 bg-slate-700 border-slate-600" aria-label="date order">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-slate-100">
                      <SelectItem value="DMY">day/month/year</SelectItem>
                      <SelectItem value="MDY">month/day/year</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              )}
              {needsFormatChoice && !formatsConfirmed && (
                <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setFormatsConfirmed(true)}>
                  These formats are right
                </Button>
              )}
            </div>
          </div>

          {/* Problems */}
          {result.errors.length > 0 && (
            <IssueList
              tone="error"
              title={`${result.errors.length} problem${result.errors.length === 1 ? '' : 's'} must be fixed in the file before importing`}
              issues={result.errors}
            />
          )}
          {result.warnings.length > 0 && <IssueList tone="warning" title="Notes" issues={result.warnings} />}

          {/* Variables */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="py-2 pr-3 font-medium">Variable</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Values</th>
                <th className="py-2 pr-3 font-medium w-44">Action</th>
                <th className="py-2 font-medium w-64">Existing variable</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((decision, index) => (
                <ImportRow
                  key={decision.variable.name}
                  index={index}
                  decision={decision}
                  existingVariables={existingVariables}
                  onChange={choice => setChoice(decision.variable.name, choice)}
                />
              ))}
            </tbody>
          </table>
          {counts.update > 0 && (
            <p className="text-xs text-slate-400">
              Update adds the file&apos;s months to the existing variable and overwrites months it already has. Its other months stay unchanged.
            </p>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-700 sm:justify-between">
          <div className="text-sm text-slate-400" data-testid="import-summary">
            {counts.add} new · {counts.update} update · {counts.skip} skip
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={blocked || isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IssueList({ tone, title, issues }: { tone: 'error' | 'warning'; title: string; issues: CsvImportResult['errors'] }): React.ReactNode {
  const styles = tone === 'error' ? 'border-red-500/50 bg-red-950/30 text-red-200' : 'border-slate-600 bg-slate-900/40 text-slate-300'
  return (
    <div className={`rounded-md border p-3 text-sm ${styles}`} role={tone === 'error' ? 'alert' : undefined}>
      <p className="mb-1 font-medium">{title}</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {issues.slice(0, MAX_ISSUES_SHOWN).map((issue, i) => (
          <li key={i}>Row {issue.row}{issue.column ? `, column "${issue.column}"` : ''}: {issue.message}</li>
        ))}
      </ul>
      {issues.length > MAX_ISSUES_SHOWN && <p className="mt-1">… and {issues.length - MAX_ISSUES_SHOWN} more</p>}
    </div>
  )
}

interface ImportRowProps {
  index: number
  decision: VariableImportDecision
  existingVariables: Variable[]
  onChange: (choice: { action: ImportAction; targetId?: string }) => void
}

function ImportRow({ index, decision, existingVariables, onChange }: ImportRowProps): React.ReactNode {
  const { variable } = decision
  const range = monthRangeLabel(variable.points)
  const preview = variable.points.slice(0, PREVIEW_POINTS)
    .map(p => `${formatMonthLabel(p.month)}: ${formatValue(p.value)}`)
    .join(' · ')

  return (
    <tr data-testid={`variable-row-${index}`} className="border-b border-slate-700/60 align-top">
      <td className="py-2 pr-3 font-medium text-slate-100">{variable.name}</td>
      <td className="py-2 pr-3"><VariableTypeBadge type={variable.type} /></td>
      <td className="py-2 pr-3 text-slate-300">
        <div>{variable.points.length} months{range ? ` · ${range}` : ''}</div>
        {preview && (
          <div className="text-xs text-slate-400">
            {preview}{variable.points.length > PREVIEW_POINTS ? ' · …' : ''}
          </div>
        )}
      </td>
      <td className="py-2 pr-3">
        <Select
          value={decision.action}
          onValueChange={(value: string) => onChange({ action: value as ImportAction, targetId: value === 'update' ? decision.targetId : undefined })}
        >
          <SelectTrigger className="h-8 bg-slate-700 border-slate-600" aria-label={`action for ${variable.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-slate-100">
            <SelectItem value="add">Add as new</SelectItem>
            <SelectItem value="update" disabled={existingVariables.length === 0}>Update existing</SelectItem>
            <SelectItem value="skip">Skip</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="py-2">
        {decision.action === 'update' && (
          <Select value={decision.targetId ?? ''} onValueChange={(targetId) => onChange({ action: 'update', targetId })}>
            <SelectTrigger className="h-8 bg-slate-700 border-slate-600" aria-label={`variable to update with ${variable.name}`}>
              <SelectValue placeholder="Choose a variable" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600 text-slate-100">
              {existingVariables.map(existing => (
                <SelectItem key={existing.id} value={existing.id}>
                  {existing.name} ({existing.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
    </tr>
  )
}

function VariableTypeBadge({ type }: { type: Variable['type'] }): React.ReactNode {
  const badgeClasses = {
    ACTUAL: 'bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-500/30',
    BUDGET: 'bg-blue-900/40 text-blue-300 ring-1 ring-blue-500/30',
    INPUT: 'bg-purple-900/40 text-purple-300 ring-1 ring-purple-500/30',
    UNKNOWN: 'bg-slate-700 text-slate-300 ring-1 ring-slate-500/30'
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badgeClasses[type]}`}>
      {type}
    </span>
  )
}
