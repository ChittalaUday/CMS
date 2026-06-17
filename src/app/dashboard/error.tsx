"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangleIcon } from "lucide-react"

const isDev = process.env.NODE_ENV === "development"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isDev) {
      console.error("[Dashboard Error]", error)
    }
  }, [error])

  const userMessage = isDev
    ? (error.message || "An unexpected error occurred in the dashboard.")
    : "Something went wrong. Please try again or contact support if the problem persists."

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
        <AlertTriangleIcon className="size-5 text-destructive" />
      </div>
      <div className="text-center space-y-1.5 max-w-sm">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">{userMessage}</p>
        {isDev && error.digest && (
          <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">digest: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
