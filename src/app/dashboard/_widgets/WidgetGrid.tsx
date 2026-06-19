import { cn } from "@/lib/utils/utils"

export type WidgetSize = "sm" | "md" | "lg" | "full"

const SPAN: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1 sm:col-span-2",
  lg: "col-span-1 sm:col-span-2 lg:col-span-3",
  full: "col-span-full",
}

export function WidgetSlot({
  size = "sm",
  children,
  className,
}: {
  size?: WidgetSize
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn(SPAN[size], className)}>{children}</div>
}

export function WidgetGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min",
        className
      )}
    >
      {children}
    </div>
  )
}
