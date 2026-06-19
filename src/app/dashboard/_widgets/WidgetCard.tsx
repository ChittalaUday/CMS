import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/utils"

interface WidgetCardProps {
  title: string
  description?: string
  loading?: boolean
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
  contentClassName?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function WidgetCard({
  title,
  description,
  loading,
  children,
  action,
  className,
  contentClassName,
  icon: Icon,
}: WidgetCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary shrink-0" />}
          <span>{title}</span>
        </CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
