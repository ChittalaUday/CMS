"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAction } from "next-safe-action/hooks"
import { updatePassword } from "@/app/_actions/settings"
import { logoutAction } from "@/app/_actions/auth"
import { Loader2, EyeIcon, EyeOffIcon, LogOutIcon, KeyRoundIcon } from "lucide-react"

export function AccountForm() {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [logoutPending, startLogoutTransition] = useTransition()

  const { execute } = useAction(updatePassword, {
    onSuccess: () => {
      toast.success("Password updated")
      setOpen(false)
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Failed to update password"),
  })

  function handleSave() {
    startTransition(() => {
      execute({ newPassword, confirmPassword })
    })
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setNewPassword("")
      setConfirmPassword("")
      setShowNew(false)
      setShowConfirm(false)
    }
    setOpen(val)
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await logoutAction()
      window.location.href = "/"
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Account</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your password and session.
        </p>
      </div>
      <Separator className="border-border/40" />

      {/* Password row */}
      <div className="flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium text-foreground">Password</p>
          <p className="text-xs text-muted-foreground mt-0.5">Update your account password.</p>
        </div>
        <Button
          variant="outline"
          className="h-9 gap-2 text-sm font-semibold border-border/60 shrink-0"
          onClick={() => setOpen(true)}
        >
          <KeyRoundIcon className="size-4" />
          Change
        </Button>
      </div>

      {/* Session row */}
      <div className="flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium text-foreground">Session</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sign out of this device.</p>
        </div>
        <Button
          variant="outline"
          className="h-9 gap-2 text-sm font-semibold border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60 shrink-0"
          onClick={handleLogout}
          disabled={logoutPending}
        >
          {logoutPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOutIcon className="size-4" />
          )}
          {logoutPending ? "Logging out…" : "Log out"}
        </Button>
      </div>

      {/* Change password dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs text-muted-foreground">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-9 bg-muted/30 border-border/80 text-sm pr-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="h-9 bg-muted/30 border-border/80 text-sm pr-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-destructive">Passwords do not match</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || newPassword.length < 8 || newPassword !== confirmPassword}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
