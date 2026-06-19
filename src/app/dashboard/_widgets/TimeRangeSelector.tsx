"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils/utils"

const OPTIONS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const

export function TimeRangeSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const current = Number(params.get("days") ?? 30)

  function select(days: number) {
    const next = new URLSearchParams(params.toString())
    next.set("days", String(days))
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`)
    })
  }

  return (
    <div className={cn("flex items-center gap-1", isPending && "opacity-60 pointer-events-none")}>
      {OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => select(value)}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
            current === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
