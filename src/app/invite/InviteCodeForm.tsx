"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GalleryVerticalEndIcon, KeyRoundIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import Link from "next/link"

export function InviteCodeForm({
  submitCode,
}: {
  submitCode: (formData: FormData) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    const raw = (formData.get("code") as string | null)?.replace(/[-\s]/g, "").trim()
    if (!raw || raw.length < 8) {
      toast.error("Please enter a valid 8-character access code.")
      return
    }
    setPending(true)
    try {
      await submitCode(formData)
      // redirect handled server-side; if we reach here, code was invalid
      toast.error("Access code not found. Please check and try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <GalleryVerticalEndIcon className="size-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Enter your access code</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your admin shared an 8-character code when they created your account.
        </p>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Access Code
          </Label>
          <div className="relative">
            <KeyRoundIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="code"
              name="code"
              placeholder="ABCD-1234"
              required
              className="h-10 pl-9 font-mono tracking-widest text-center uppercase bg-muted/30 border-border/80"
              maxLength={9}
              onChange={(e) => {
                const v = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
                e.target.value = v.length > 4 ? v.slice(0, 4) + "-" + v.slice(4, 8) : v
              }}
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-10 font-semibold" disabled={pending}>
          {pending ? "Verifying…" : "Continue"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Have an invite link?{" "}
        <Link href="/" className="text-primary hover:underline underline-offset-4">
          Sign in instead
        </Link>
      </p>
    </div>
  )
}
