import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5 w-full px-1 py-3">
      {/* Back button */}
      <Skeleton className="h-8 w-28 bg-muted animate-pulse rounded-md" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 bg-muted animate-pulse" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
            <Skeleton className="h-3 w-20 bg-muted animate-pulse" />
            <Skeleton className="h-5 w-20 bg-muted animate-pulse rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-4 flex items-center gap-3">
            <Skeleton className="size-5 bg-muted animate-pulse rounded-full shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-8 w-8 bg-muted animate-pulse" />
              <Skeleton className="h-3 w-16 bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Search + tab bar */}
      <div className="flex gap-3 items-center">
        <Skeleton className="h-9 flex-1 max-w-sm bg-muted animate-pulse rounded-md" />
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      </div>

      {/* Applications table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-4">
          <Skeleton className="h-4 w-32 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-24 bg-muted animate-pulse hidden sm:block" />
          <Skeleton className="h-4 w-20 bg-muted animate-pulse hidden md:block" />
          <Skeleton className="h-4 w-16 bg-muted animate-pulse ml-auto" />
          <Skeleton className="h-4 w-16 bg-muted animate-pulse hidden lg:block" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="space-y-1 min-w-0">
                  <Skeleton className="h-4 w-36 bg-muted animate-pulse" />
                  <Skeleton className="h-3 w-44 bg-muted animate-pulse" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 bg-muted animate-pulse hidden sm:block" />
              <Skeleton className="h-5 w-20 bg-muted animate-pulse rounded-full hidden md:block" />
              <Skeleton className="h-4 w-16 bg-muted animate-pulse" />
              <Skeleton className="h-8 w-8 bg-muted animate-pulse rounded-md hidden lg:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
