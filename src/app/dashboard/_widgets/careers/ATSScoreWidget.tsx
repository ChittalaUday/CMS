import { WidgetCard } from "../WidgetCard"
import { cn } from "@/lib/utils/utils"
import type { ATSRow } from "../../_data/careers-queries"

interface Props {
  data: ATSRow[]
}

function scoreBadge(score: number) {
  if (score >= 70)
    return { label: "Strong", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" }
  if (score >= 40)
    return { label: "Moderate", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
  return { label: "Low", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
}

export function ATSScoreWidget({ data }: Props) {
  return (
    <WidgetCard title="ATS Score by Job" description="Avg. score per posting">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No scored applications yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium pr-4">Job</th>
                <th className="pb-2 font-medium text-right pr-4">Avg.</th>
                <th className="pb-2 font-medium text-right hidden sm:table-cell pr-4">
                  Apps
                </th>
                <th className="pb-2 font-medium text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const badge = scoreBadge(row.avgScore)
                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 pr-4">
                      <span className="line-clamp-1 font-medium text-foreground">
                        {row.jobTitle}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums font-medium">
                      {row.avgScore}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums hidden sm:table-cell text-muted-foreground">
                      {row.count}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  )
}
