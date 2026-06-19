"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { KanbanCard } from "./KanbanCard"
import { Users } from "lucide-react"

type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"

interface Answer {
  id: string
  answer: string
  question: {
    id: string
    question: string
    type: string
    order: number
  }
}

interface Application {
  id: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string | null
  resumeUrl: string | null
  coverLetter: string | null
  status: ApplicationStatus
  notes: string | null
  atsScore: number | null
  atsConfidence: number | null
  atsJustification: string | null
  extractedSkills: string[]
  extractedExperience: number | null
  extractedLocation: string | null
  extractedEducation: string | null
  atsStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "IDLE"
  createdAt: Date
  answers?: Answer[]
}

interface KanbanColumnProps {
  status: ApplicationStatus
  label: string
  dotColor: string
  applications: Application[]
  onViewDetails: (app: Application) => void
  onStatusChange: (id: string, status: ApplicationStatus) => void
}

export function KanbanColumn({
  status,
  label,
  dotColor,
  applications,
  onViewDetails,
  onStatusChange,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full md:flex-1 md:min-w-[200px] rounded-2xl border bg-muted/20 p-4 min-h-[500px] transition-all duration-200 ${
        isOver
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/50"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-4">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${dotColor}`} />
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
            {label}
          </h3>
        </div>
        <Badge
          variant="secondary"
          className="text-xs px-2 py-0.5 font-bold bg-muted/60"
        >
          {applications.length}
        </Badge>
      </div>

      {/* Sortable Area */}
      <SortableContext
        items={applications.map((app) => app.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-320px)] md:max-h-[600px] min-h-[150px]">
          {applications.length === 0 ? (
            <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/60 rounded-xl bg-card/10 text-muted-foreground gap-1.5 transition-all">
              <Users className="size-5 opacity-40" />
              <p className="text-[11px] font-medium">No candidates</p>
              <p className="text-[9px] opacity-75 max-w-[150px]">
                Drag cards here to update status.
              </p>
            </div>
          ) : (
            applications.map((app) => (
              <KanbanCard
                key={app.id}
                application={app}
                onViewDetails={onViewDetails}
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
