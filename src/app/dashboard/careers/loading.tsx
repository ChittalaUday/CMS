import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5 w-full px-1 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-28 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-96 bg-muted animate-pulse" />
        </div>
        <Skeleton className="h-10 w-32 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <Skeleton className="h-9 flex-1 bg-muted animate-pulse rounded-md" />
          <Skeleton className="h-9 w-36 bg-muted animate-pulse rounded-md" />
        </div>
        <Skeleton className="h-4 w-24 bg-muted animate-pulse" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-4">
          <Skeleton className="h-4 w-40 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-28 bg-muted animate-pulse hidden md:block" />
          <Skeleton className="h-4 w-24 bg-muted animate-pulse hidden lg:block" />
          <Skeleton className="h-4 w-20 bg-muted animate-pulse ml-auto hidden lg:block" />
          <Skeleton className="h-4 w-20 bg-muted animate-pulse hidden sm:block" />
          <Skeleton className="h-4 w-16 bg-muted animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-4">
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className="h-4 w-52 bg-muted animate-pulse" />
                <Skeleton className="h-3 w-32 bg-muted animate-pulse" />
              </div>
              <Skeleton className="h-4 w-24 bg-muted animate-pulse hidden md:block" />
              <Skeleton className="h-4 w-20 bg-muted animate-pulse hidden lg:block" />
              <Skeleton className="h-5 w-16 bg-muted animate-pulse rounded-full hidden lg:block" />
              <Skeleton className="h-5 w-12 bg-muted animate-pulse hidden sm:block" />
              <Skeleton className="h-8 w-8 bg-muted animate-pulse rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
