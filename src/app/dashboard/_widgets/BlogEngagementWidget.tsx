"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { WidgetCard } from "./WidgetCard"
import type { EngagementByDay } from "../_data/dashboard-queries"

const CHART_CONFIG = {
  views: { label: "Views", color: "hsl(var(--primary))" },
  likes: { label: "Likes", color: "hsl(38, 92%, 55%)" },
} satisfies ChartConfig

interface Props {
  data: EngagementByDay
  days: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shortDate(iso: any) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function BlogEngagementWidget({ data, days }: Props) {
  return (
    <WidgetCard title="Views vs Likes" description={`Last ${days} days`} contentClassName="pb-2">
      <ChartContainer config={CHART_CONFIG} className="w-full aspect-[4/3] min-h-[160px]">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent labelFormatter={shortDate} indicator="dot" />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="views"
            stroke="var(--color-views)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="likes"
            stroke="var(--color-likes)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </WidgetCard>
  )
}
