import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-64 bg-muted animate-pulse" />
        </div>
        <Skeleton className="h-10 w-28 bg-muted animate-pulse" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64 bg-muted animate-pulse" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/30 p-4 border-b border-border flex justify-between">
          <Skeleton className="h-5 w-32 bg-muted animate-pulse" />
          <Skeleton className="h-5 w-32 bg-muted animate-pulse" />
          <Skeleton className="h-5 w-32 bg-muted animate-pulse" />
          <Skeleton className="h-5 w-16 bg-muted animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex justify-between items-center">
              <div className="space-y-1">
                <Skeleton className="h-5 w-40 bg-muted animate-pulse" />
                <Skeleton className="h-4 w-28 bg-muted animate-pulse" />
              </div>
              <Skeleton className="h-5 w-32 bg-muted animate-pulse" />
              <Skeleton className="h-5 w-24 bg-muted animate-pulse" />
              <Skeleton className="h-8 w-10 bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
