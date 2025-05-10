'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import { X } from 'lucide-react'
import { Variable, TimeSeriesData } from '@/lib/store/variables'
import { format } from 'date-fns'

interface VariableDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  variableToEdit: Variable | null
  onSave: (variableId: string, updateData: { name?: string; timeSeries?: TimeSeriesData[]; type?: Variable['type'] }, organizationId: string | null) => Promise<void>
  currentOrganizationId: string | null
}

// Utility function to parse number input with international notation
const parseNumberInput = (value: string): number | null => {
  if (!value || value.trim() === '') return null
  
  // Remove thousand separators and keep the decimal separator
  const normalized = value
    .replace(/\s/g, '')     // Remove any whitespace
    .replace(/,/g, '')      // Remove commas (thousand separators in international format)
  
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? null : parsed
}

// Format number for display in edit field
const formatNumberForEdit = (value: number | null): string => {
  if (value === null) return ''
  return value.toString()
}

export function VariableDetailsModal({
  isOpen,
  onClose,
  variableToEdit,
  onSave,
  currentOrganizationId
}: VariableDetailsModalProps): React.ReactNode {
  const [editableVariable, setEditableVariable] = useState<Variable | null>(null)
  const [editingCellIndex, setEditingCellIndex] = useState<number | null>(null)
  const [editedValue, setEditedValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Create a deep copy of the variable when it changes
  useEffect(() => {
    if (variableToEdit) {
      // Deep clone the variable to isolate local changes
      setEditableVariable({
        ...variableToEdit,
        timeSeries: variableToEdit.timeSeries.map(ts => ({
          date: new Date(ts.date),
          value: ts.value
        }))
      })
    } else {
      setEditableVariable(null)
    }
    
    // Reset editing state
    setEditingCellIndex(null)
    setEditedValue('')
  }, [variableToEdit])

  if (!isOpen || !editableVariable) return null

  // Sort time series data by date for consistent display
  const sortedTimeSeries = [...editableVariable.timeSeries].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEditableVariable(prev => prev ? { ...prev, name: e.target.value } : null)
  }

  const handleTypeChange = (value: string): void => {
    setEditableVariable(prev => 
      prev ? { 
        ...prev, 
        type: value as 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN'
      } : null
    )
  }

  const startEditingValue = (index: number): void => {
    setEditingCellIndex(index)
    setEditedValue(formatNumberForEdit(sortedTimeSeries[index].value))
  }

  const confirmValueChange = (): void => {
    if (editingCellIndex === null) return

    const updatedTimeSeries = [...sortedTimeSeries]
    const parsedValue = parseNumberInput(editedValue)
    
    updatedTimeSeries[editingCellIndex] = {
      ...updatedTimeSeries[editingCellIndex],
      value: parsedValue
    }
    
    setEditableVariable(prev => prev ? {
      ...prev,
      timeSeries: updatedTimeSeries
    } : null)
    
    setEditingCellIndex(null)
    setEditedValue('')
  }

  const cancelValueChange = (): void => {
    setEditingCellIndex(null)
    setEditedValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      confirmValueChange()
    } else if (e.key === 'Escape') {
      cancelValueChange()
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!editableVariable) return
    
    setIsSaving(true)
    
    try {
      // Determine what's changed to only send modified fields
      const updateData: {
        name?: string;
        type?: Variable['type'];
        timeSeries?: TimeSeriesData[];
      } = {}
      
      if (editableVariable.name !== variableToEdit?.name) {
        updateData.name = editableVariable.name
      }
      
      if (editableVariable.type !== variableToEdit?.type) {
        updateData.type = editableVariable.type
      }
      
      // Check if time series data has changed (we need a deep comparison)
      const timeSeriesChanged = JSON.stringify(sortedTimeSeries) !== 
        JSON.stringify([...variableToEdit!.timeSeries].sort((a, b) => 
          a.date.getTime() - b.date.getTime()
        ))
      
      if (timeSeriesChanged) {
        updateData.timeSeries = sortedTimeSeries
      }
      
      // Only call API if something changed
      if (Object.keys(updateData).length > 0) {
        await onSave(editableVariable.id, updateData, currentOrganizationId)
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving variable:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Variable Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden py-4">
          {/* Variable Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-sm font-medium">Name:</label>
            <Input 
              className="col-span-3"
              value={editableVariable.name}
              onChange={handleNameChange}
            />
          </div>
          
          {/* Variable Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-sm font-medium">Type:</label>
            <Select 
              value={editableVariable.type} 
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTUAL">ACTUAL</SelectItem>
                <SelectItem value="BUDGET">BUDGET</SelectItem>
                <SelectItem value="INPUT">INPUT</SelectItem>
                <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Time Series Data */}
          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            <label className="text-sm font-medium">Time Series Data:</label>
            <div className="border rounded-md overflow-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-sm">Date</th>
                    <th className="px-4 py-2 text-right font-medium text-sm">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTimeSeries.length > 0 ? (
                    sortedTimeSeries.map((point, index) => (
                      <tr 
                        key={index}
                        className="border-t hover:bg-muted/30"
                      >
                        <td className="px-4 py-2 text-sm">
                          {format(point.date, 'MM/yyyy')}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {editingCellIndex === index ? (
                            <div className="flex items-center space-x-1 justify-end">
                              <Input
                                className="w-24 text-right py-1 px-2 h-8"
                                value={editedValue}
                                onChange={(e) => setEditedValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={confirmValueChange}
                              >
                                <span className="sr-only">Confirm</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={cancelValueChange}
                              >
                                <span className="sr-only">Cancel</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:underline text-sm"
                              onClick={() => startEditingValue(index)}
                            >
                              {point.value !== null ? point.value.toLocaleString() : '-'}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-center text-muted-foreground">
                        No time series data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
        
        <DialogClose asChild>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            aria-label="Close"
            onClick={onClose}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
} 