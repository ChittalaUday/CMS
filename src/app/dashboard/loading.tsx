import { Skeleton } from "@/components/ui/skeleton"

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
      <Skeleton className="h-4 w-28 mb-4" />
      <Skeleton className="h-36 w-full" />
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
        <SkeletonCard className="col-span-full" />
        <SkeletonCard className="col-span-1 sm:col-span-2" />
        <SkeletonCard className="col-span-1 sm:col-span-2" />
        <SkeletonCard className="col-span-full" />
        <SkeletonCard className="col-span-1 sm:col-span-2" />
        <SkeletonCard className="col-span-1 sm:col-span-2" />
        <SkeletonCard className="col-span-full" />
      </div>
    </div>
  )
}
