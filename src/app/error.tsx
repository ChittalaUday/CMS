"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangleIcon } from "lucide-react"

const isDev = process.env.NODE_ENV === "development"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isDev) {
      console.error("[Global Error]", error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
        <AlertTriangleIcon className="size-6 text-destructive" />
      </div>
      <div className="text-center space-y-1.5 max-w-sm">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          {isDev
            ? (error.message || "An unexpected error occurred.")
            : "An unexpected error occurred. Please try again or contact support."}
        </p>
        {isDev && error.digest && (
          <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">digest: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
