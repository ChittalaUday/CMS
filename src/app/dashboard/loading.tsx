import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Skeleton className="aspect-video rounded-xl bg-muted/50 w-full animate-pulse" />
        <Skeleton className="aspect-video rounded-xl bg-muted/50 w-full animate-pulse" />
        <Skeleton className="aspect-video rounded-xl bg-muted/50 w-full animate-pulse" />
      </div>
      <Skeleton className="min-h-[400px] flex-1 rounded-xl bg-muted/50 w-full animate-pulse" />
    </div>
  )
}
