import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils/utils"

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
    label: string
  }
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex items-start justify-between">
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.direction === "up" && "text-green-600",
                trend.direction === "down" && "text-red-500",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
              {trend.direction === "down" && (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.direction === "neutral" && <Minus className="h-3 w-3" />}
              {trend.value}%
            </span>
          )}
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
          {trend && (
            <p className="mt-0.5 text-xs text-muted-foreground">{trend.label}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
