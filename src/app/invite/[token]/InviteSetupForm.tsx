"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { acceptInvite } from "@/app/_actions/invites"
import { EyeIcon, EyeOffIcon, Loader2Icon, CheckIcon } from "lucide-react"

const STRENGTH_LEVELS = [
  { label: "Too short", color: "bg-destructive" },
  { label: "Weak", color: "bg-orange-500" },
  { label: "Fair", color: "bg-yellow-500" },
  { label: "Good", color: "bg-blue-500" },
  { label: "Strong", color: "bg-emerald-500" },
]

function passwordStrength(pw: string): number {
  if (pw.length < 8) return 0
  let score = 1
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

export function InviteSetupForm({ token }: { token: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const strength = passwordStrength(password)
  const strengthInfo = STRENGTH_LEVELS[strength]
  const passwordsMatch = confirm.length > 0 && password === confirm

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.")
      return
    }
    startTransition(async () => {
      try {
        await acceptInvite(token, password)
        toast.success("Account activated! Setting up your profile…")
        router.push("/onboarding")
        router.refresh()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong. Please try again."
        toast.error(message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            className="h-10 pr-10 bg-muted/30 border-border/80 text-sm"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>

        {/* Strength bar */}
        {password.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {STRENGTH_LEVELS.slice(1).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i < strength ? strengthInfo.color : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className={`text-[10px] font-semibold ${
              strength <= 1 ? "text-destructive" : strength === 2 ? "text-orange-500" : strength === 3 ? "text-yellow-500" : "text-emerald-500"
            }`}>
              {strengthInfo.label}
            </p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            required
            className="h-10 pr-10 bg-muted/30 border-border/80 text-sm"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirm((v) => !v)}
            tabIndex={-1}
          >
            {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
          {passwordsMatch && (
            <CheckIcon className="absolute right-9 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />
          )}
        </div>
        {confirm.length > 0 && !passwordsMatch && (
          <p className="text-[10px] text-destructive font-semibold">Passwords do not match</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-10 font-semibold"
        disabled={isPending || !passwordsMatch || strength < 1}
      >
        {isPending ? (
          <>
            <Loader2Icon className="size-4 animate-spin mr-2" />
            Activating…
          </>
        ) : (
          "Activate Account"
        )}
      </Button>
    </form>
  )
}
