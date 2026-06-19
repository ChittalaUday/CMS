"use client"

import { useState, useTransition, useMemo } from "react"
import {
  DndContext,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragEndEvent,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { KanbanColumn } from "./KanbanColumn"
import { ApplicationDetailDialog } from "./ApplicationDetailDialog"
import { Input } from "@/components/ui/input"
import { Search, User, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { evaluateSearchQuery } from "@/lib/ats/search-parser"
import { updateApplicationStatus } from "../../actions"

type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED"
const STATUSES: ApplicationStatus[] = ["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"]

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  NEW: ["REVIEWING"],
  REVIEWING: ["NEW", "SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["REVIEWING", "HIRED"],
  HIRED: ["SHORTLISTED"],
  REJECTED: ["REVIEWING"],
}

// Prioritise column droppables over card sortables so drag-to-column always registers
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  const colHit = pointer.find(({ id }) => STATUSES.includes(id as ApplicationStatus))
  if (colHit) return [colHit]
  if (pointer.length > 0) return pointer
  return rectIntersection(args)
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; dotColor: string }
> = {
  NEW: { label: "New", dotColor: "bg-blue-500" },
  REVIEWING: { label: "Reviewing", dotColor: "bg-yellow-500" },
  SHORTLISTED: { label: "Shortlisted", dotColor: "bg-purple-500" },
  REJECTED: { label: "Rejected", dotColor: "bg-red-500" },
  HIRED: { label: "Hired", dotColor: "bg-emerald-500" },
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

interface JobPosting {
  id: string
  title: string
  department: string
  location: string
  description: string | null
  requirements: string | null
  keywords: string[]
}

interface ApplicationsKanbanProps {
  applications: Application[]
  job: JobPosting
  search?: string
}

export function ApplicationsKanban({
  applications: initialApplications,
  job,
  search: propSearch,
}: ApplicationsKanbanProps) {
  const [applications, setApplications] = useState<Application[]>(initialApplications)
  const [localSearch, setLocalSearch] = useState("")
  const search = propSearch !== undefined ? propSearch : localSearch
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [mobileTab, setMobileTab] = useState<ApplicationStatus>("NEW")
  const [isPending, startTransition] = useTransition()

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require dragging 8px before activation to avoid misclicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press delay to avoid page scroll conflicts on touchscreens
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter application cards by search bar
  const filteredApplications = useMemo(() => {
    return applications.filter((a) => {
      if (!search.trim()) return true
      return evaluateSearchQuery(search, {
        applicantName: a.applicantName,
        applicantEmail: a.applicantEmail,
        coverLetter: a.coverLetter,
        extractedSkills: a.extractedSkills || [],
        extractedExperience: a.extractedExperience || 0,
        extractedLocation: a.extractedLocation || null,
        extractedEducation: a.extractedEducation || null,
      })
    })
  }, [applications, search])

  // Group applications by status
  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, Application[]> = {
      NEW: [],
      REVIEWING: [],
      SHORTLISTED: [],
      REJECTED: [],
      HIRED: [],
    }
    for (const app of filteredApplications) {
      if (map[app.status]) {
        map[app.status].push(app)
      }
    }
    return map
  }, [filteredApplications])

  // Get total counts (ignoring search filter for column indicators)
  const totalCounts = useMemo(() => {
    const counts: Record<ApplicationStatus, number> = {
      NEW: 0,
      REVIEWING: 0,
      SHORTLISTED: 0,
      REJECTED: 0,
      HIRED: 0,
    }
    for (const app of applications) {
      if (counts[app.status] !== undefined) {
        counts[app.status]++
      }
    }
    return counts
  }, [applications])

  // Handle manual status update via detail sheet or mobile dropdown
  async function handleStatusUpdate(id: string, newStatus: ApplicationStatus, notes?: string) {
    const original = applications.find((a) => a.id === id)
    if (!original) return

    // Optimistic Update
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus, notes: notes !== undefined ? notes : a.notes } : a))
    )
    if (selectedApp?.id === id) {
      setSelectedApp((prev) =>
        prev ? { ...prev, status: newStatus, notes: notes !== undefined ? notes : prev.notes } : null
      )
    }

    try {
      await updateApplicationStatus(id, newStatus, notes)
      toast.success(`Application updated to ${STATUS_CONFIG[newStatus].label}.`)
    } catch (err: unknown) {
      // Revert
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: original.status, notes: original.notes } : a))
      )
      if (selectedApp?.id === id) {
        setSelectedApp(original)
      }
      toast.error((err as Error).message || "Failed to update candidate status.")
    }
  }

  // Handle drag and drop action
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const applicationId = active.id as string
    const target = over.id as string

    // Find active application
    const app = applications.find((a) => a.id === applicationId)
    if (!app) return

    // Determine target status
    let targetStatus: ApplicationStatus | null = null

    if (STATUSES.includes(target as ApplicationStatus)) {
      // Dropped directly on column droppable zone
      targetStatus = target as ApplicationStatus
    } else {
      // Dropped over another card, find that card's status
      const overApp = applications.find((a) => a.id === target)
      if (overApp) {
        targetStatus = overApp.status
      }
    }

    if (!targetStatus || targetStatus === app.status) return

    const allowed = ALLOWED_TRANSITIONS[app.status]
    if (!allowed.includes(targetStatus)) {
      toast.error(`Cannot move ${STATUS_CONFIG[app.status].label} → ${STATUS_CONFIG[targetStatus].label}.`)
      return
    }

    // Optimistic update
    const originalStatus = app.status
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status: targetStatus! } : a))
    )

    try {
      await updateApplicationStatus(applicationId, targetStatus, app.notes ?? undefined)
      toast.success(`Candidate moved to ${STATUS_CONFIG[targetStatus].label}.`)
    } catch (err: unknown) {
      // Revert optimistic update
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: originalStatus } : a))
      )
      toast.error((err as Error).message || "Failed to move candidate status.")
    }
  }

  return (
    <>
      {/* Search Bar */}
      <div className="flex items-center gap-3 justify-between pb-3 border-b border-border/40">
        {propSearch === undefined ? (
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search applicants by name, skills..."
              className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <p className="text-xs text-muted-foreground shrink-0">
          {filteredApplications.length} of {applications.length} shown
        </p>
      </div>

      {/* Mobile Tab Selector (shown below md breakpoint) */}
      <div className="flex md:hidden overflow-x-auto gap-1 p-1 bg-muted/35 rounded-xl border border-border/40 shrink-0">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setMobileTab(status)}
            className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center transition-all ${
              mobileTab === status
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_CONFIG[status].label} ({totalCounts[status]})
          </button>
        ))}
      </div>

      {/* Kanban Board Container */}
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
        {/* Desktop Layout: side-by-side scrollable columns */}
        <div className="hidden md:flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[550px] w-full">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              label={STATUS_CONFIG[status].label}
              dotColor={STATUS_CONFIG[status].dotColor}
              applications={grouped[status]}
              onViewDetails={setSelectedApp}
              onStatusChange={handleStatusUpdate}
            />
          ))}
        </div>

        {/* Mobile Layout: show only the selected tab's column */}
        <div className="md:hidden pt-2">
          <KanbanColumn
            status={mobileTab}
            label={STATUS_CONFIG[mobileTab].label}
            dotColor={STATUS_CONFIG[mobileTab].dotColor}
            applications={grouped[mobileTab]}
            onViewDetails={setSelectedApp}
            onStatusChange={handleStatusUpdate}
          />
        </div>
      </DndContext>

      {/* Application Details Dialog */}
      <ApplicationDetailDialog
        application={selectedApp}
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        job={job}
        onStatusChange={handleStatusUpdate}
        onApplicationUpdate={(updated) => {
          setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
          if (selectedApp?.id === updated.id) {
            setSelectedApp(updated)
          }
        }}
      />
    </>
  )
}
