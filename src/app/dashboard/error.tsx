"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-sm text-center">
        {error.message || "An unexpected error occurred in the dashboard."}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
