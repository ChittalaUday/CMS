"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X, Loader2 } from "lucide-react"

interface JobsToolbarProps {
  totalCount: number
  search: string
  statusFilter: string
}

export function JobsToolbar({ totalCount, search, statusFilter }: JobsToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        if (val) params.set(key, val)
        else params.delete(key)
      }
      params.delete("page")
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const hasFilters = !!search || !!statusFilter

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          {isPending ? (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
          ) : null}
          <Input
            defaultValue={search}
            onChange={(e) => updateParams({ search: e.target.value || undefined })}
            placeholder="Search jobs…"
            className="h-8 pl-8 pr-8 text-xs bg-muted/30 border-border/60"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => updateParams({ status: v === "ALL" ? undefined : v })}
        >
          <SelectTrigger className="h-8 w-32 text-xs bg-muted/30 border-border/60 shrink-0">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
            <SelectItem value="DRAFT" className="text-xs">Draft</SelectItem>
            <SelectItem value="PUBLISHED" className="text-xs">Published</SelectItem>
            <SelectItem value="CLOSED" className="text-xs">Closed</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 px-2 text-muted-foreground"
            onClick={() => updateParams({ search: undefined, status: undefined })}
          >
            <X className="size-3" /> Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground shrink-0">
        {totalCount} {totalCount === 1 ? "job" : "jobs"}
      </p>
    </div>
  )
}
