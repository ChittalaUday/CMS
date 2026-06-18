import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6 max-w-xl">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-28 bg-muted animate-pulse" />
          <Skeleton className="h-3 w-56 bg-muted animate-pulse" />
        </div>
        <Skeleton className="h-9 w-28 bg-muted animate-pulse rounded-md shrink-0" />
      </div>

      {/* Avatar + name row */}
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-5">
          <Skeleton className="size-16 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-4 w-36 bg-muted animate-pulse" />
            <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
            <Skeleton className="h-3 w-40 bg-muted animate-pulse" />
          </div>
          <Skeleton className="h-6 w-20 bg-muted animate-pulse rounded-full shrink-0" />
        </div>

        <div className="border-t border-border/40 pt-4 space-y-2">
          <Skeleton className="h-3 w-8 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-full bg-muted animate-pulse" />
          <Skeleton className="h-4 w-3/4 bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}
