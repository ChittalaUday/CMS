"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart3 } from "lucide-react"
import { WidgetCard } from "./WidgetCard"
import type { AppPerJob } from "../_data/dashboard-queries"

const CHART_CONFIG = {
  count: { label: "Applications", color: "hsl(var(--primary))" },
} satisfies ChartConfig

interface Props {
  data: AppPerJob[]
}

export function ApplicationsPerJobWidget({ data }: Props) {
  return (
    <WidgetCard title="Applications per Job" description="Top 10 by count" contentClassName="pb-2" icon={BarChart3}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No applications yet.
        </p>
      ) : (
        <ChartContainer config={CHART_CONFIG} className="w-full aspect-[4/3] min-h-[180px]">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -20, bottom: 48 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="jobTitle"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </WidgetCard>
  )
}
