"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { KanbanCard } from "./KanbanCard"
import { Users, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

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
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  isLoading?: boolean
  onPageChange: (newPage: number) => void
  onViewDetails: (app: Application) => void
  onStatusChange: (id: string, status: ApplicationStatus) => void
}

export function KanbanColumn({
  status,
  label,
  dotColor,
  applications,
  totalCount,
  page,
  pageSize,
  totalPages,
  isLoading = false,
  onPageChange,
  onViewDetails,
  onStatusChange,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full md:flex-1 md:min-w-50 rounded-2xl border bg-muted/20 p-4 min-h-125 transition-all duration-200 ${
        isOver
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/50"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`size-2.5 rounded-full shrink-0 ${dotColor}`} />
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider truncate">
            {label}
          </h3>
        </div>
        <Badge
          variant="secondary"
          className="text-xs px-2 py-0.5 font-bold bg-muted/60 shrink-0 tabular-nums"
        >
          {totalCount}
        </Badge>
      </div>

      {/* Sortable Area */}
      <SortableContext
        items={applications.map((app) => app.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-320px)] md:max-h-150 min-h-37.5 relative">
          {isLoading ? (
            <div className="h-full min-h-37.5 flex flex-col items-center justify-center text-center p-4 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin opacity-60 text-primary" />
              <p className="text-[11px] font-medium text-muted-foreground">Loading candidates...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="h-full min-h-37.5 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/60 rounded-xl bg-card/10 text-muted-foreground gap-1.5 transition-all">
              <Users className="size-5 opacity-40" />
              <p className="text-[11px] font-medium">No candidates</p>
              <p className="text-[9px] opacity-75 max-w-37.5">
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

      {/* Column Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40 text-xs shrink-0">
          <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
            {startItem}–{endItem} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded-lg border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              aria-label={`Previous page for ${label}`}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-[11px] font-semibold text-foreground px-1.5 tabular-nums">
              {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded-lg border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              aria-label={`Next page for ${label}`}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
      {totalCount > 0 && totalPages <= 1 && (
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/30 text-xs shrink-0">
          <span className="text-[10px] text-muted-foreground/75 font-medium">
            {totalCount} {totalCount === 1 ? "candidate" : "candidates"}
          </span>
        </div>
      )}
    </div>
  )
}

