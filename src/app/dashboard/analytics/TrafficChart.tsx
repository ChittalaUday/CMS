"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const CONFIG = {
  pageviews: { label: "Pageviews", color: "var(--primary)" },
  visitors: { label: "Visitors", color: "var(--muted-foreground)" },
} satisfies ChartConfig

export type TrafficPoint = { x: string; pageviews: number; visitors: number }

export function TrafficChart({ data, unit, timeZone }: { data: TrafficPoint[]; unit: "hour" | "day"; timeZone: string }) {
  // Same zone Umami buckets in, so a bucket never lands on the wrong date for viewers elsewhere.
  const fmt = (iso: unknown) =>
    new Date(String(iso)).toLocaleString(
      "en-IN",
      unit === "hour" ? { timeZone, month: "short", day: "numeric", hour: "numeric" } : { timeZone, month: "short", day: "numeric" }
    )

  if (data.every((d) => d.pageviews === 0)) {
    return <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No traffic in this period yet.</p>
  }

  return (
    <ChartContainer config={CONFIG} className="h-[220px] w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="x" tickFormatter={fmt} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={32} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={fmt} indicator="dot" />} />
        <Area type="monotone" dataKey="pageviews" stroke="var(--color-pageviews)" fill="var(--color-pageviews)" fillOpacity={0.12} strokeWidth={2} />
        <Area type="monotone" dataKey="visitors" stroke="var(--color-visitors)" fill="var(--color-visitors)" fillOpacity={0.08} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  )
}
