"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type Variable } from '@/lib/store/variables'
import { X } from 'lucide-react'

export type ImportAction = 'add' | 'update' | 'skip'

export interface VariableImportDecision {
  variable: Variable
  action: ImportAction
  replaceId?: string
}

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  newVariables: Variable[]
  existingVariables: Variable[]
  onConfirm: (decisions: VariableImportDecision[]) => void
}

export function ImportModal({
  isOpen,
  onClose,
  newVariables,
  existingVariables,
  onConfirm
}: ImportModalProps) {
  const [decisions, setDecisions] = useState<VariableImportDecision[]>([])
  
  useEffect(() => {
    if (newVariables.length > 0) {
      setDecisions(
        newVariables.map(variable => ({
          variable,
          action: 'add'
        }))
      )
    }
  }, [newVariables])

  const handleActionChange = (index: number, action: ImportAction) => {
    setDecisions(prev => {
      const newDecisions = [...prev]
      newDecisions[index] = {
        ...newDecisions[index],
        action,
        replaceId: action === 'update' ? newDecisions[index].replaceId : undefined
      }
      return newDecisions
    })
  }

  const handleReplaceTargetChange = (index: number, replaceId: string) => {
    setDecisions(prev => {
      const newDecisions = [...prev]
      newDecisions[index] = {
        ...newDecisions[index],
        replaceId
      }
      return newDecisions
    })
  }

  const handleConfirm = () => {
    onConfirm(decisions)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] w-[90vw] overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">Import Variables</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose how to handle each variable from your CSV file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="border-b px-6 py-2">
            <div className="flex items-center text-sm">
              <div className="w-[400px] font-medium">Variable</div>
              <div className="w-[100px] font-medium">Type</div>
              <div className="w-[180px] font-medium">Action</div>
              <div className="flex-1 font-medium">Update</div>
            </div>
          </div>
          
          <ScrollArea className="h-[60vh]">
            <div className="px-6">
              {decisions.map((decision, index) => (
                <ImportRow 
                  key={decision.variable.id}
                  decision={decision}
                  index={index}
                  existingVariables={existingVariables}
                  onActionChange={handleActionChange}
                  onReplaceTargetChange={handleReplaceTargetChange}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-end space-x-2 p-6 border-t bg-gray-50/90">
          <div className="flex-1 text-sm text-muted-foreground">
            {decisions.length} variables selected
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Apply Changes
            </Button>
          </div>
        </DialogFooter>

        <DialogClose asChild>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

interface ImportRowProps {
  decision: VariableImportDecision
  index: number
  existingVariables: Variable[]
  onActionChange: (index: number, action: ImportAction) => void
  onReplaceTargetChange: (index: number, replaceId: string) => void
}

function ImportRow({
  decision,
  index,
  existingVariables,
  onActionChange,
  onReplaceTargetChange
}: ImportRowProps) {
  return (
    <div className="flex items-center py-3 border-b last:border-0">
      <div className="w-[400px] truncate" title={decision.variable.name}>
        <div className="font-medium">{decision.variable.name}</div>
      </div>
      <div className="w-[100px]">
        <VariableTypeBadge type={decision.variable.type} />
      </div>
      <div className="w-[180px]">
        <Select
          value={decision.action}
          onValueChange={(value: string) => onActionChange(index, value as ImportAction)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add as New</SelectItem>
            <SelectItem value="update">Update Existing</SelectItem>
            <SelectItem value="skip">Skip</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 pl-4">
        {decision.action === 'update' && (
          <Select
            value={decision.replaceId || ''}
            onValueChange={(value) => onReplaceTargetChange(index, value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select a variable to update" />
            </SelectTrigger>
            <SelectContent>
              {existingVariables.map(variable => (
                <SelectItem key={variable.id} value={variable.id}>
                  {variable.name} ({variable.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}

interface VariableTypeBadgeProps {
  type: Variable['type']
}

function VariableTypeBadge({ type }: VariableTypeBadgeProps) {
  const badgeClasses = {
    ACTUAL: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    BUDGET: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    INPUT: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20',
    UNKNOWN: 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20'
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${badgeClasses[type]}`}>
      {type}
    </span>
  )
} 