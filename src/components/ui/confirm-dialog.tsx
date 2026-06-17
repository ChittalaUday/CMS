import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-5 bg-background border border-border rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-3 border-t border-border/40 mt-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description: string
  buttonText?: string
}

export function AlertDialogCustom({
  isOpen,
  onClose,
  title = "Notice",
  description,
  buttonText = "OK",
}: AlertDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-5 bg-background border border-border rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-3 border-t border-border/40 mt-2">
          <Button size="sm" className="h-8 text-xs font-semibold" onClick={onClose}>
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
