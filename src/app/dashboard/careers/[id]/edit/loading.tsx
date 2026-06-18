import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5 w-full px-1 py-3">
      {/* Header */}
      <div className="pb-5 border-b border-border/60 space-y-1.5">
        <Skeleton className="h-9 w-40 bg-muted animate-pulse" />
        <Skeleton className="h-4 w-72 bg-muted animate-pulse" />
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
            <Skeleton className="h-3 w-20 bg-muted animate-pulse hidden sm:block" />
            {step < 4 && <Skeleton className="h-px w-6 bg-muted animate-pulse hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border/60 bg-card/30 p-6 space-y-6">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-56 bg-muted animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2 space-y-2">
            <Skeleton className="h-3 w-20 bg-muted animate-pulse" />
            <Skeleton className="h-9 w-full bg-muted animate-pulse rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
            <Skeleton className="h-9 w-full bg-muted animate-pulse rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 bg-muted animate-pulse" />
            <Skeleton className="h-9 w-full bg-muted animate-pulse rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 bg-muted animate-pulse" />
            <Skeleton className="h-9 w-full bg-muted animate-pulse rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 bg-muted animate-pulse" />
            <Skeleton className="h-9 w-full bg-muted animate-pulse rounded-md" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Skeleton className="h-3 w-16 bg-muted animate-pulse" />
            <div className="flex gap-3">
              <Skeleton className="h-9 w-28 bg-muted animate-pulse rounded-md" />
              <Skeleton className="h-9 flex-1 bg-muted animate-pulse rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-2">
        <Skeleton className="h-9 w-24 bg-muted animate-pulse rounded-md" />
        <Skeleton className="h-9 w-28 bg-muted animate-pulse rounded-md" />
      </div>
    </div>
  )
}
