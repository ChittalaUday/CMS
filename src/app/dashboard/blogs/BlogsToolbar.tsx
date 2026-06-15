"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, X, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Category {
  id: string
  name: string
}

interface BlogsToolbarProps {
  categories: Category[]
  totalCount: number
  search: string
  categoryId: string
}

export function BlogsToolbar({ categories, totalCount, search, categoryId }: BlogsToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      // Reset to page 1 whenever filter changes
      if (!("page" in updates)) {
        params.delete("page")
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const hasFilters = !!search || !!categoryId

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-0 sm:max-w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
        <Input
          id="blogs-search"
          defaultValue={search}
          placeholder="Search by title or slug…"
          className="pl-9 pr-8 h-9 bg-muted/30 border-border/60 text-sm focus-visible:ring-1"
          onChange={(e) => {
            const val = e.target.value
            // Debounce by 350 ms so we don't push on every keystroke
            const timeout = setTimeout(() => {
              updateParams({ search: val || undefined })
            }, 350)
            return () => clearTimeout(timeout)
          }}
        />
        {search && (
          <button
            onClick={() => updateParams({ search: undefined })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none" />
        <select
          id="blogs-category-filter"
          value={categoryId}
          onChange={(e) => updateParams({ categoryId: e.target.value || undefined })}
          className="h-9 pl-9 pr-8 rounded-md border border-border/60 bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateParams({ search: undefined, categoryId: undefined })}
          className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="size-3.5" />
          Clear
        </Button>
      )}

      {/* Result count — right-aligned on sm+ */}
      <p className="text-xs text-muted-foreground font-medium sm:ml-auto shrink-0">
        {isPending ? "Loading…" : `${totalCount} article${totalCount !== 1 ? "s" : ""}`}
      </p>
    </div>
  )
}
