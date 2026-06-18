import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 bg-muted animate-pulse rounded-lg" />
            <Skeleton className="h-7 w-64 bg-muted animate-pulse" />
          </div>
          <Skeleton className="h-3 w-72 bg-muted animate-pulse ml-10" />
        </div>
        <div className="flex items-center gap-3 pl-10 md:pl-0 flex-wrap">
          <Skeleton className="h-7 w-40 bg-muted animate-pulse rounded-full" />
          <Skeleton className="h-8 w-24 bg-muted animate-pulse rounded-md" />
          <Skeleton className="h-8 w-36 bg-muted animate-pulse rounded-md" />
          <Skeleton className="h-8 w-32 bg-muted animate-pulse rounded-md" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border/60 pb-px">
        <Skeleton className="h-9 w-44 bg-muted animate-pulse rounded-t-md" />
        <Skeleton className="h-9 w-44 bg-muted animate-pulse rounded-t-md" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 bg-muted animate-pulse" />
              <Skeleton className="size-4 bg-muted animate-pulse rounded" />
            </div>
            <Skeleton className="h-8 w-12 bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      {/* Memory diagnostics panel */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-52 bg-muted animate-pulse" />
          <Skeleton className="h-3 w-72 bg-muted animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-32 bg-muted animate-pulse" />
          <Skeleton className="h-3 w-32 bg-muted animate-pulse" />
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/60 bg-muted/20">
          <Skeleton className="h-4 w-48 bg-muted animate-pulse" />
        </div>
        <div className="bg-muted/40 px-5 py-3 border-b border-border/60 flex gap-6">
          <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
          <Skeleton className="h-3 w-24 bg-muted animate-pulse hidden sm:block" />
          <Skeleton className="h-3 w-16 bg-muted animate-pulse hidden md:block" />
          <Skeleton className="h-3 w-16 bg-muted animate-pulse hidden md:block" />
          <Skeleton className="h-3 w-40 bg-muted animate-pulse hidden lg:block" />
          <Skeleton className="h-3 w-20 bg-muted animate-pulse ml-auto" />
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-6">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 bg-muted animate-pulse" />
                <Skeleton className="h-3 w-44 bg-muted animate-pulse" />
              </div>
              <Skeleton className="h-4 w-28 bg-muted animate-pulse hidden sm:block" />
              <Skeleton className="h-5 w-20 bg-muted animate-pulse rounded-full hidden md:block" />
              <Skeleton className="h-5 w-10 bg-muted animate-pulse hidden md:block" />
              <Skeleton className="h-3 w-48 bg-muted animate-pulse hidden lg:block" />
              <Skeleton className="h-3 w-16 bg-muted animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
