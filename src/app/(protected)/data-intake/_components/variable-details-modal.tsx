'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { Variable, TimeSeriesData } from '@/lib/store/variables'
import type { VariableDraft } from './api-hooks'
import { formatMonthLabel, formatValue, parseUserNumber, sortByMonth } from './month-values'

type UpdateData = { name?: string; timeSeries?: TimeSeriesData[]; type?: Variable['type'] }

interface VariableDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  /** The variable to edit; null with `onCreate` opens an empty form for a new variable. */
  variableToEdit: Variable | null
  onSave: (variableId: string, updateData: UpdateData, organizationId: string | null) => Promise<boolean | void>
  onCreate?: (draft: VariableDraft, organizationId: string | null) => Promise<boolean | void>
  currentOrganizationId: string | null
}

const EMPTY_DRAFT: VariableDraft = { name: '', type: 'INPUT', timeSeries: [] }

export function VariableDetailsModal({
  isOpen,
  onClose,
  variableToEdit,
  onSave,
  onCreate,
  currentOrganizationId
}: VariableDetailsModalProps): React.ReactNode {
  const isCreate = variableToEdit === null
  const [draft, setDraft] = useState<VariableDraft>(EMPTY_DRAFT)
  const [editingMonth, setEditingMonth] = useState<string | null>(null)
  const [editedValue, setEditedValue] = useState<string>('')
  const [newMonth, setNewMonth] = useState<string>('')
  const [newValue, setNewValue] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Start from a copy, so edits stay local until saved
  useEffect(() => {
    setDraft(variableToEdit
      ? { name: variableToEdit.name, type: variableToEdit.type, timeSeries: sortByMonth(variableToEdit.timeSeries) }
      : EMPTY_DRAFT)
    setEditingMonth(null)
    setEditedValue('')
    setNewMonth('')
    setNewValue('')
    setFormError(null)
  }, [variableToEdit, isOpen])

  if (!isOpen || (isCreate && !onCreate)) return null

  const points = draft.timeSeries

  const startEditingValue = (point: TimeSeriesData): void => {
    setEditingMonth(point.month)
    setEditedValue(point.value === null ? '' : String(point.value))
    setFormError(null)
  }

  const confirmValueChange = (): void => {
    if (editingMonth === null) return
    const value = parseUserNumber(editedValue)
    if (value === undefined) {
      setFormError(`"${editedValue}" is not a number.`)
      return
    }
    setDraft(prev => ({ ...prev, timeSeries: prev.timeSeries.map(p => (p.month === editingMonth ? { ...p, value } : p)) }))
    setEditingMonth(null)
    setEditedValue('')
    setFormError(null)
  }

  const cancelValueChange = (): void => {
    setEditingMonth(null)
    setEditedValue('')
    setFormError(null)
  }

  const removePoint = (month: string): void => {
    setDraft(prev => ({ ...prev, timeSeries: prev.timeSeries.filter(p => p.month !== month) }))
  }

  const addPoint = (): void => {
    if (!/^\d{4}-\d{2}$/.test(newMonth)) {
      setFormError('Choose a month for the new value.')
      return
    }
    if (points.some(p => p.month === newMonth)) {
      setFormError(`${formatMonthLabel(newMonth)} already has a value; edit it in the table.`)
      return
    }
    const value = parseUserNumber(newValue)
    if (value === undefined) {
      setFormError(`"${newValue}" is not a number.`)
      return
    }
    setDraft(prev => ({ ...prev, timeSeries: sortByMonth([...prev.timeSeries, { month: newMonth, value }]) }))
    setNewMonth('')
    setNewValue('')
    setFormError(null)
  }

  const handleSave = async (): Promise<void> => {
    if (!draft.name.trim()) {
      setFormError('The variable needs a name.')
      return
    }
    setIsSaving(true)
    try {
      let saved: boolean | void
      if (variableToEdit === null) {
        saved = await onCreate!({ ...draft, name: draft.name.trim() }, currentOrganizationId)
      } else {
        const updateData: UpdateData = {}
        if (draft.name.trim() !== variableToEdit.name) updateData.name = draft.name.trim()
        if (draft.type !== variableToEdit.type) updateData.type = draft.type
        if (JSON.stringify(points) !== JSON.stringify(sortByMonth(variableToEdit.timeSeries))) updateData.timeSeries = points
        saved = Object.keys(updateData).length > 0
          ? await onSave(variableToEdit.id, updateData, currentOrganizationId)
          : true
      }
      if (saved !== false) onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') confirmValueChange()
    else if (e.key === 'Escape') cancelValueChange()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !isSaving) onClose() }}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            {isCreate ? 'New variable' : 'Variable details'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="variable-name" className="text-sm font-medium text-slate-200">Name:</label>
            <Input
              id="variable-name"
              className="col-span-3 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-blue-500"
              value={draft.name}
              placeholder="e.g. Revenue"
              onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-sm font-medium text-slate-200">Type:</label>
            <Select value={draft.type} onValueChange={value => setDraft(prev => ({ ...prev, type: value as Variable['type'] }))}>
              <SelectTrigger className="col-span-3 bg-slate-700 border-slate-600 text-slate-100 focus:border-blue-500" aria-label="variable type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {(['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN'] as const).map(type => (
                  <SelectItem key={type} value={type} className="text-slate-100 hover:bg-slate-600 focus:bg-slate-600">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            <label className="text-sm font-medium text-slate-200">Monthly values:</label>
            <div className="border border-slate-600 rounded-md overflow-auto flex-1 bg-slate-700">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-600 border-b border-slate-500">
                    <th className="px-4 py-2 text-left font-medium text-sm text-slate-100">Month</th>
                    <th className="px-4 py-2 text-right font-medium text-sm text-slate-100">Value</th>
                    <th className="w-10" aria-label="actions" />
                  </tr>
                </thead>
                <tbody>
                  {points.length > 0 ? points.map(point => (
                    <tr key={point.month} className="border-t border-slate-600 hover:bg-slate-600/50">
                      <td className="px-4 py-2 text-sm text-slate-200">{formatMonthLabel(point.month)}</td>
                      <td className="px-4 py-2 text-right">
                        {editingMonth === point.month ? (
                          <div className="flex items-center space-x-1 justify-end">
                            <Input
                              className="w-28 text-right py-1 px-2 h-8 bg-slate-800 border-slate-500 text-slate-100 focus:border-blue-500"
                              value={editedValue}
                              onChange={e => setEditedValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              aria-label={`value for ${formatMonthLabel(point.month)}`}
                              autoFocus
                            />
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-900/20" onClick={confirmValueChange}>
                              <span className="sr-only">Confirm</span>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={cancelValueChange}>
                              <span className="sr-only">Cancel</span>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="cursor-pointer hover:underline text-sm text-slate-200 hover:text-blue-400"
                            onClick={() => startEditingValue(point)}
                          >
                            {formatValue(point.value)}
                          </button>
                        )}
                      </td>
                      <td className="pr-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => removePoint(point.month)}
                          aria-label={`remove ${formatMonthLabel(point.month)}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-center text-slate-400">No values yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="month"
                className="w-44 bg-slate-700 border-slate-600 text-slate-100"
                value={newMonth}
                onChange={e => setNewMonth(e.target.value)}
                aria-label="new month"
              />
              <Input
                className="w-36 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400"
                value={newValue}
                placeholder="Value"
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addPoint() }}
                aria-label="new value"
              />
              <Button variant="outline" onClick={addPoint} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                <Plus className="mr-1 h-4 w-4" /> Add month
              </Button>
            </div>
            {formError && <p className="text-sm text-red-400" role="alert">{formError}</p>}
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2 border-t border-slate-700 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSaving ? 'Saving...' : isCreate ? 'Create variable' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
