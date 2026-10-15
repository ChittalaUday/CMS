import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5 w-full px-1 py-3">
      <div className="pb-5 border-b border-border/60 space-y-1.5">
        <Skeleton className="h-9 w-56 bg-muted animate-pulse" />
        <Skeleton className="h-4 w-80 max-w-full bg-muted animate-pulse" />
      </div>
      <div className="rounded-xl border border-border/60 bg-card/30 p-6 space-y-4">
        <Skeleton className="h-9 w-full bg-muted animate-pulse" />
        <Skeleton className="h-9 w-full bg-muted animate-pulse" />
        <Skeleton className="h-24 w-full bg-muted animate-pulse" />
      </div>
      <Skeleton className="h-64 w-full bg-muted animate-pulse rounded-xl" />
    </div>
  )
}
