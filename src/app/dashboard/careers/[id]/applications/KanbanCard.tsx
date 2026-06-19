"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  FileText,
  ExternalLink,
  Eye,
  Calendar,
  Sparkles,
  MessageSquare,
  Loader2,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  NEW: ["REVIEWING"],
  REVIEWING: ["NEW", "SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["REVIEWING", "HIRED"],
  HIRED: ["SHORTLISTED"],
  REJECTED: ["REVIEWING"],
}

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

interface KanbanCardProps {
  application: Application
  onViewDetails: (app: Application) => void
  onStatusChange: (id: string, status: ApplicationStatus) => void
}

function getRelativeTime(dateInput: Date | string) {
  const date = new Date(dateInput)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 1) return "Today"
  if (diffDays === 2) return "Yesterday"
  if (diffDays < 7) return `${diffDays - 1} days ago`
  if (diffDays < 30) return `${Math.floor((diffDays - 1) / 7)}w ago`
  return `${Math.floor((diffDays - 1) / 30)}mo ago`
}

export function KanbanCard({
  application,
  onViewDetails,
  onStatusChange,
}: KanbanCardProps) {
  const isTerminalState = ALLOWED_TRANSITIONS[application.status].length === 0

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    disabled: isTerminalState,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }

  // ATS score badge color
  let atsBadgeClass = "bg-muted text-muted-foreground"
  if (application.atsStatus === "COMPLETED" && application.atsScore !== null) {
    const score = application.atsScore
    if (score >= 70) {
      atsBadgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    } else if (score >= 40) {
      atsBadgeClass = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
    } else {
      atsBadgeClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
    }
  }

  const initials = application.applicantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isTerminalState ? attributes : {})}
      className={`group relative rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-all duration-200 select-none ${
        isTerminalState ? "hover:border-border/60" : "hover:border-primary/30"
      }`}
    >
      {/* Top Header: Name + drag handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-xs text-muted-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-foreground leading-snug truncate group-hover:text-primary transition-colors">
              {application.applicantName}
            </h4>
            <p className="text-[11px] text-muted-foreground truncate">
              {application.applicantEmail}
            </p>
          </div>
        </div>
        {!isTerminalState && (
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/30 hover:text-muted-foreground/70 mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </div>
        )}
      </div>

      {/* Badges / Meta info */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {/* Applied date */}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground border-border/40 gap-1">
          <Calendar className="size-2.5" />
          {getRelativeTime(application.createdAt)}
        </Badge>

        {/* ATS score if computed */}
        {application.atsStatus === "COMPLETED" && application.atsScore !== null && (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold gap-1 ${atsBadgeClass}`}>
            <Sparkles className="size-2.5" />
            {application.atsScore}% Match
          </Badge>
        )}

        {application.atsStatus === "PROCESSING" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 animate-pulse gap-1">
            <Loader2 className="size-2.5 animate-spin" />
            Analyzing
          </Badge>
        )}

        {application.notes && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 gap-1">
            <MessageSquare className="size-2.5" />
            Notes
          </Badge>
        )}
      </div>

      {/* Mobile/Tablet dropdown for quick status changes */}
      {ALLOWED_TRANSITIONS[application.status].length > 0 && (
        <div className="mt-3.5 md:hidden">
          <Select
            onValueChange={(value) => onStatusChange(application.id, value as ApplicationStatus)}
          >
            <SelectTrigger className="h-7 text-[10px] w-full bg-muted/40 border-border/60">
              <span>Move status...</span>
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_TRANSITIONS[application.status].map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  Move to {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3.5 flex items-center justify-between border-t border-border/40 pt-2.5 gap-2">
        {application.resumeUrl ? (
          <a
            href={application.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <FileText className="size-3" />
            Resume
            <ExternalLink className="size-2.5 text-muted-foreground/40 group-hover:text-primary/40" />
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 italic">
            No Resume
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px] font-semibold text-primary hover:bg-primary/5 hover:text-primary gap-1"
          onClick={() => onViewDetails(application)}
        >
          <Eye className="size-3" />
          View Details
        </Button>
      </div>
    </div>
  )
}
