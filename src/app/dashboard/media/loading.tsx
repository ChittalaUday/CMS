import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/60">
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-40 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-80 bg-muted animate-pulse" />
        </div>
        <Skeleton className="h-10 w-36 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Search + filter */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] items-center">
        <Skeleton className="h-9 w-full max-w-xl bg-muted animate-pulse rounded-md" />
        <Skeleton className="h-10 w-36 bg-muted animate-pulse rounded-lg" />
      </div>

      {/* Gallery + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Gallery */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton
                key={i}
                className="aspect-square rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Inspector panel */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
              <Skeleton className="h-4 w-24 bg-muted animate-pulse" />
            </div>
            <div className="p-4 space-y-4">
              <Skeleton className="aspect-video w-full bg-muted animate-pulse rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-full bg-muted animate-pulse" />
                <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
              </div>
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-muted animate-pulse" />
                  <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-14 bg-muted animate-pulse" />
                  <Skeleton className="h-3 w-16 bg-muted animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20 bg-muted animate-pulse" />
                  <Skeleton className="h-3 w-20 bg-muted animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Skeleton className="h-8 w-full bg-muted animate-pulse rounded-md" />
                <Skeleton className="h-8 w-full bg-muted animate-pulse rounded-md" />
                <Skeleton className="h-8 w-full bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
