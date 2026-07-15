"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BlogsPaginationProps {
  page: number
  totalPages: number
}

export function BlogsPagination({ page, totalPages }: BlogsPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (p === 1) {
      params.delete("page")
    } else {
      params.set("page", String(p))
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  if (totalPages <= 1) return null

  // Build visible page numbers window
  const delta = 2
  const range: (number | "…")[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      range.push(i)
    } else if (range[range.length - 1] !== "…") {
      range.push("…")
    }
  }

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-muted-foreground font-medium hidden sm:block">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        {/* First */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          disabled={page === 1 || isPending}
          onClick={() => goTo(1)}
          title="First page"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>

        {/* Prev */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          disabled={page === 1 || isPending}
          onClick={() => goTo(page - 1)}
          title="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        {/* Page numbers */}
        {range.map((item, i) =>
          item === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "default" : "ghost"}
              size="icon"
              className={`size-8 rounded-lg text-xs font-semibold ${
                item === page ? "pointer-events-none" : ""
              }`}
              disabled={isPending}
              onClick={() => goTo(item as number)}
            >
              {item}
            </Button>
          )
        )}

        {/* Next */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          disabled={page === totalPages || isPending}
          onClick={() => goTo(page + 1)}
          title="Next page"
        >
          <ChevronRight className="size-3.5" />
        </Button>

        {/* Last */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          disabled={page === totalPages || isPending}
          onClick={() => goTo(totalPages)}
          title="Last page"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
