"use client"

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
import { AlertTriangle, X } from 'lucide-react'
import type { VariableUsage } from './_components/api-hooks'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  variableName: string
  onConfirm: () => void
  /** Forecasts that read the variable; deleting is allowed but they lose its values. */
  usage: VariableUsage
}

function UsageNotice({ usage }: { usage: VariableUsage }): React.ReactNode {
  if (usage.status === 'loading') {
    return <p className="text-sm text-muted-foreground">Checking which forecasts use it…</p>
  }
  if (usage.status === 'failed') {
    return (
      <p role="alert" className="text-sm text-amber-500">
        Could not check whether forecasts use this variable.
      </p>
    )
  }
  if (usage.forecasts.length === 0) {
    return null
  }
  const count = usage.forecasts.length
  return (
    <div role="alert" className="flex items-start gap-2 rounded border border-amber-600 bg-amber-900/30 p-3 text-sm text-amber-100">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
      <div>
        <p className="font-medium">Used in {count === 1 ? '1 forecast' : `${count} forecasts`}:</p>
        <ul className="mt-1 list-disc pl-4">
          {usage.forecasts.map((forecast) => (
            <li key={forecast.id}>{forecast.name}</li>
          ))}
        </ul>
        <p className="mt-1">Their nodes that read this variable will have no values until you choose another variable.</p>
      </div>
    </div>
  )
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  variableName,
  onConfirm,
  usage
}: DeleteConfirmationModalProps): React.ReactNode {
  const handleConfirm = (): void => {
    onConfirm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Confirm Deletion</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            Are you sure you want to delete the variable <span className="font-medium">"{variableName}"</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <UsageNotice usage={usage} />

        <DialogFooter className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={usage.status === 'loading'}>
            Delete
          </Button>
        </DialogFooter>

        <DialogClose asChild>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            aria-label="close icon"
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