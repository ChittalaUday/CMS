"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClientSelect } from "@/components/ClientSelect"
import { moveRecordToClient, type MovableKind } from "@/app/dashboard/clients/move-actions"

type Props = {
  kind: MovableKind
  id: string
  currentClientId: string | null
  clients: { id: string; name: string }[]
  /** Where to go after the move: the record may no longer be visible under the active client. */
  redirectTo: string
  disabled?: boolean
  className?: string
}

/** Client picker on an edit screen. Picking another client asks to confirm, then moves the record. Super admin only (empty `clients` renders nothing). */
export function ClientMove({ kind, id, currentClientId, clients, redirectTo, disabled, className }: Props) {
  const router = useRouter()
  const [target, setTarget] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const targetName = clients.find((c) => c.id === target)?.name

  if (clients.length === 0) return null

  const confirm = () =>
    startTransition(async () => {
      try {
        await moveRecordToClient(kind, id, target!)
        toast.success(`Moved to ${targetName}`)
        router.push(redirectTo)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not move the record")
      } finally {
        setTarget(null)
      }
    })

  return (
    <>
      <ClientSelect
        clients={clients}
        value={currentClientId ?? ""}
        onChange={(v) => v !== currentClientId && setTarget(v)}
        disabled={disabled || pending}
        className={className}
      />
      <AlertDialog open={target !== null} onOpenChange={(open) => !open && !pending && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to {targetName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "post" && "The post stops showing under its current client and its categories are removed, because categories belong to a client. "}
              {kind === "user" && "The user signs in to the new client and loses access to the old one. "}
              {kind !== "post" && kind !== "user" && "It stops showing under its current client's website and dashboard. "}
              Any unsaved edits on this screen are lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirm()
              }}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
