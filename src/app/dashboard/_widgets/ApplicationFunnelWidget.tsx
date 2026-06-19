"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { WidgetCard } from "./WidgetCard"
import type { FunnelRow } from "../_data/dashboard-queries"

const CHART_CONFIG = {
  NEW:         { label: "New",         color: "hsl(262, 80%, 60%)" },
  REVIEWING:   { label: "Reviewing",   color: "hsl(38, 92%, 55%)"  },
  SHORTLISTED: { label: "Shortlisted", color: "hsl(217, 91%, 60%)" },
  HIRED:       { label: "Hired",       color: "hsl(142, 71%, 45%)" },
  REJECTED:    { label: "Rejected",    color: "hsl(0, 72%, 60%)"   },
} satisfies ChartConfig

const STATUS_KEYS = ["NEW", "REVIEWING", "SHORTLISTED", "HIRED", "REJECTED"] as const

interface Props {
  data: FunnelRow[]
}

export function ApplicationFunnelWidget({ data }: Props) {
  return (
    <WidgetCard title="Applications by Status" description="Status breakdown per job posting">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No applications yet.
        </p>
      ) : (
        <ChartContainer
          config={CHART_CONFIG}
          className="w-full"
          initialDimension={{ width: 600, height: Math.max(160, data.length * 48) }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="jobTitle"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {STATUS_KEYS.map((status, i) => (
              <Bar
                key={status}
                dataKey={status}
                stackId="funnel"
                fill={`var(--color-${status})`}
                radius={
                  i === STATUS_KEYS.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </WidgetCard>
  )
}
