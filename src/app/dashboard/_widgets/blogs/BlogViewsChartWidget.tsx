"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { WidgetCard } from "../WidgetCard"
import type { ViewsByDay } from "../../_data/blog-queries"

const CHART_CONFIG = {
  views: { label: "Views", color: "hsl(var(--primary))" },
} satisfies ChartConfig

interface Props {
  data: ViewsByDay
  days: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shortDate(iso: any) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function BlogViewsChartWidget({ data, days }: Props) {
  return (
    <WidgetCard title="Page Views" description={`Last ${days} days`} contentClassName="pb-2">
      <ChartContainer config={CHART_CONFIG} className="w-full aspect-[4/1] min-h-[160px]">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
              <ChartTooltipContent
                labelFormatter={shortDate}
                indicator="dot"
              />
            }
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="var(--color-views)"
            strokeWidth={2}
            fill="url(#viewsGrad)"
          />
        </AreaChart>
      </ChartContainer>
    </WidgetCard>
  )
}
