"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ApplicationsPaginationProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export function ApplicationsPagination({
  page,
  pageSize,
  totalCount,
  totalPages,
}: ApplicationsPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const goTo = (p: number, newPageSize?: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (p === 1) {
      params.delete("page")
    } else {
      params.set("page", String(p))
    }
    if (newPageSize) {
      if (newPageSize === 20) {
        params.delete("pageSize")
      } else {
        params.set("pageSize", String(newPageSize))
      }
      params.delete("page")
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  if (totalCount === 0) return null

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

  // Visible page numbers calculation
  const delta = 1
  const range: (number | "…")[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      range.push(i)
    } else if (range[range.length - 1] !== "…") {
      range.push("…")
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-2 border-t border-border/50 text-xs w-full">
      <div className="flex items-center gap-3 text-muted-foreground flex-wrap justify-center sm:justify-start">
        <span>
          Showing <strong className="text-foreground font-semibold">{startItem}–{endItem}</strong> of{" "}
          <strong className="text-foreground font-semibold">{totalCount}</strong> applications
        </span>
        <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
          <span className="text-muted-foreground/80">Per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => goTo(1, parseInt(val, 10))}
            disabled={isPending}
          >
            <SelectTrigger className="h-7 w-16.25 text-xs bg-muted/30 border-border/60">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-lg border-border/60"
            disabled={page <= 1 || isPending}
            onClick={() => goTo(1)}
            title="First page"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-lg border-border/60"
            disabled={page <= 1 || isPending}
            onClick={() => goTo(page - 1)}
            title="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>

          {range.map((item, i) =>
            item === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground select-none">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "outline"}
                size="icon"
                className={`size-7 rounded-lg text-xs font-semibold ${
                  item === page ? "pointer-events-none" : "border-border/60"
                }`}
                disabled={isPending}
                onClick={() => goTo(item as number)}
              >
                {item}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-lg border-border/60"
            disabled={page >= totalPages || isPending}
            onClick={() => goTo(page + 1)}
            title="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-lg border-border/60"
            disabled={page >= totalPages || isPending}
            onClick={() => goTo(totalPages)}
            title="Last page"
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
