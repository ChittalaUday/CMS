"use client"

import Link from "next/link"
import { MapPin, Briefcase, Users, Calendar, ArrowRight } from "lucide-react"
import { WidgetCard } from "../WidgetCard"
import { Badge } from "@/components/ui/badge"

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
}

export type ActiveJob = {
  id: string
  title: string
  department: string
  location: string
  jobType: string
  createdAt: string | Date
  closingDate?: string | Date | null
  _count: {
    applications: number
  }
}

interface Props {
  jobs: ActiveJob[]
}

export function ActiveCareersWidget({ jobs }: Props) {
  return (
    <WidgetCard
      title="Active Careers"
      description="Select an active job posting to manage its applications"
      icon={Briefcase}
    >
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Briefcase className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No active job postings.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => {
            const date = new Date(job.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })

            return (
              <Link
                key={job.id}
                href={`/dashboard/careers/${job.id}/applications`}
                className="group flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-border/80 bg-card hover:bg-accent/40 transition-all duration-200"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {job.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                      {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                    </Badge>
                    {job.closingDate && (() => {
                      const closingDate = new Date(job.closingDate)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      closingDate.setHours(0, 0, 0, 0)
                      const daysDiff = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
                      if (daysDiff >= 0 && daysDiff <= 5) {
                        return (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-px shrink-0 bg-red-500/10 text-red-600 border-red-500/20 animate-pulse font-bold">
                            Closing in {daysDiff}d
                          </Badge>
                        )
                      }
                      return null
                    })()}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="size-3" />
                      {job.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {job.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col items-end text-right">
                    <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Users className="size-3.5 text-muted-foreground" />
                      {job._count.applications}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="size-2.5" />
                      {date}
                    </span>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
