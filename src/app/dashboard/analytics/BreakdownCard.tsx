import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type BreakdownRow = { label: string; value: number }

/** A ranked list with proportional bars (top pages, referrers, countries, devices). */
export function BreakdownCard({ title, rows, empty = "No data yet." }: { title: string; rows: BreakdownRow[] | null; empty?: string }) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.value))
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load this.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.label} className="relative flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm">
                <span className="absolute inset-y-0 left-0 rounded-md bg-muted" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden />
                <span className="relative min-w-0 truncate" title={r.label}>{r.label}</span>
                <span className="relative shrink-0 tabular-nums text-muted-foreground">{r.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
