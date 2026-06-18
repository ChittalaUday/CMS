import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div className="space-y-1">
        <Skeleton className="h-5 w-20 bg-muted animate-pulse" />
        <Skeleton className="h-3 w-48 bg-muted animate-pulse" />
      </div>
      <div className="border-t border-border/40" />

      {/* Password row */}
      <div className="flex items-center justify-between max-w-sm">
        <div className="space-y-1">
          <Skeleton className="h-4 w-20 bg-muted animate-pulse" />
          <Skeleton className="h-3 w-44 bg-muted animate-pulse" />
        </div>
        <Skeleton className="h-9 w-24 bg-muted animate-pulse rounded-md shrink-0" />
      </div>

      {/* Session row */}
      <div className="flex items-center justify-between max-w-sm">
        <div className="space-y-1">
          <Skeleton className="h-4 w-16 bg-muted animate-pulse" />
          <Skeleton className="h-3 w-36 bg-muted animate-pulse" />
        </div>
        <Skeleton className="h-9 w-24 bg-muted animate-pulse rounded-md shrink-0" />
      </div>
    </div>
  )
}
