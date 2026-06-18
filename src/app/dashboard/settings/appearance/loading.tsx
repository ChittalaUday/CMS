import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div className="space-y-1">
        <Skeleton className="h-5 w-28 bg-muted animate-pulse" />
        <Skeleton className="h-3 w-52 bg-muted animate-pulse" />
      </div>
      <div className="border-t border-border/40" />

      {/* Theme mode */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-12 bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-3 w-40 bg-muted animate-pulse" />
      </div>

      <div className="border-t border-border/40" />

      {/* Primary color */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
          <Skeleton className="h-3 w-72 bg-muted animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-3 w-60 bg-muted animate-pulse" />
      </div>
    </div>
  )
}
